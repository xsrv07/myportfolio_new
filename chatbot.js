// chatbot.js — Pure AI (Cloudflare Worker backend) + Clear Chat + Mic + Mute/Unmute (default MUTED + remembered)

/* ===== Session ID (per browser) ===== */
function getSessionId() {
  const key = "mr_x_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}
const SESSION_ID = getSessionId();

document.addEventListener("DOMContentLoaded", () => {
  /* ===== Grab elements ===== */
  const bubble = document.getElementById("chatbot-launcher");
  const windowBox = document.getElementById("chatbot-window");
  const closeBtn = document.getElementById("chatbot-close");
  const msgBox = document.getElementById("chatbot-messages");
  const inputBox = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");
  const typingIndicator = document.getElementById("chatbot-typing");

  const clearBtn = document.getElementById("chatbot-clear");
  const micBtn = document.getElementById("chatbot-mic");
  const voiceToggleBtn = document.getElementById("chatbot-voice-toggle");

  /* ===== Backend URL ===== */
  const FUNCTION_URL = "https://tiny-firefly-a524.ysmrsink.workers.dev/chatbot"; // <-- keep /chatbot

  let greeted = false;
  let sending = false;

  /* ===== Messages UI helpers ===== */
  function addMessage(text, sender = "bot") {
    const div = document.createElement("div");
    div.classList.add(sender === "bot" ? "bot-msg" : "user-msg");
    div.innerText = text;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  }
  function setTyping(isOn) {
    typingIndicator.style.display = isOn ? "block" : "none";
  }
  function setInputEnabled(enabled) {
    inputBox.disabled = !enabled;
    sendBtn.disabled = !enabled;
  }

  /* ===== Open/Close ===== */
  bubble?.addEventListener("click", () => {
    windowBox.classList.toggle("chatbot-hidden");
    if (!greeted) {
      setTimeout(() => addMessage("Hello, I’m Mr. X. How may I assist you today?"), 400);
      greeted = true;
    }
    inputBox?.focus();
  });
  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    windowBox.classList.add("chatbot-hidden");
  });

  /* ===== Send handling ===== */
  function sendUserMessage() {
    const text = inputBox.value.trim();
    if (!text || sending) return;
    addMessage(text, "user");
    inputBox.value = "";
    callBackend(text);
  }
  sendBtn?.addEventListener("click", sendUserMessage);
  inputBox?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  });

  /* ===== Voice Output: TTS (default MUTED + remembered) ===== */
  const VOICE_STATE_KEY = "mr_x_voice_enabled";
  // default = muted, unless user enabled earlier
  let voiceEnabled = localStorage.getItem(VOICE_STATE_KEY) === "true";  // <-- FIXED

  // Warm-up speech engine after first user interaction (avoids autoplay blocks)
  document.addEventListener("click", () => {
    if (window.speechSynthesis) speechSynthesis.cancel();
  }, { once: true });

  function updateVoiceIcon() {
    if (!voiceToggleBtn) return;
    voiceToggleBtn.innerHTML = voiceEnabled
      ? `<i class="bi bi-volume-up"></i>`
      : `<i class="bi bi-volume-mute"></i>`;
    voiceToggleBtn.title = voiceEnabled ? "Voice ON" : "Voice OFF (Muted)";
  }

  // Speak helper that waits for voices to be ready
  function safeSpeak(text) {
    if (!voiceEnabled || !window.speechSynthesis || !text) return;

    const synth = window.speechSynthesis;

    const speakNow = () => {
      try {
        synth.cancel(); // stop any previous utterance
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-IN";  // change to "en-US" if you prefer
        utter.rate = 1;

        // pick a voice if available (prefer en-IN/en-GB/en-US)
        const voices = synth.getVoices();
        if (voices && voices.length) {
          const preferred = voices.find(v => /en-IN|en-GB|en-US/i.test(v.lang)) || voices[0];
          if (preferred) utter.voice = preferred;
        }

        synth.speak(utter);
      } catch (e) {
        console.warn("TTS error:", e);
      }
    };

    // If voices aren’t loaded yet, wait for the event once
    if (!synth.getVoices().length) {
      const once = () => {
        synth.removeEventListener("voiceschanged", once);
        speakNow();
      };
      synth.addEventListener("voiceschanged", once, { once: true });
      // Trigger voices population in some browsers
      synth.getVoices();
      // Fallback in case event never fires
      setTimeout(speakNow, 600);
    } else {
      speakNow();
    }
  }

  voiceToggleBtn?.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    localStorage.setItem(VOICE_STATE_KEY, String(voiceEnabled));
    if (!voiceEnabled && window.speechSynthesis) {
      speechSynthesis.cancel(); // stop immediately when muting
    }
    updateVoiceIcon();
  });

  updateVoiceIcon();

  /* ===== Backend call ===== */
  async function callBackend(userMsg) {
    sending = true;
    setTyping(true);
    setInputEnabled(false);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, sessionId: SESSION_ID })
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        addMessage("Sorry, there was a problem on the server. Please try again.");
        console.error("Backend HTTP error:", res.status, detail);
      } else {
        const data = await res.json();
        const reply = data.reply || "Sorry, I couldn’t generate a response.";
        addMessage(reply);
        safeSpeak(reply); // speak only if voiceEnabled
      }
    } catch (err) {
      console.error("Fetch error:", err);
      addMessage("Sorry, there was a problem connecting to the server.");
    } finally {
      setTyping(false);
      setInputEnabled(true);
      sending = false;
      inputBox?.focus();
    }
  }

  /* ===== Clear Chat (UI + server) ===== */
  async function clearChatOnServer() {
    try {
      await fetch(FUNCTION_URL.replace("/chatbot", "/clear"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID })
      });
    } catch (e) {
      console.warn("Clear server history failed (will still clear UI).", e);
    }
  }
  function clearChatUI() {
    msgBox.innerHTML = "";
    greeted = false;
  }
  document.getElementById("chatbot-clear")?.addEventListener("click", async () => {
    await clearChatOnServer();
    clearChatUI();
    addMessage("Chat cleared.", "bot");
  });

  /* ===== Voice Input (Mic → textarea) — optional ===== */
  let rec = null;
  let listening = false;
  function getRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    return r;
  }
  micBtn?.addEventListener("click", () => {
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      alert("Voice input needs HTTPS.");
      return;
    }
    if (listening) { rec?.stop(); return; }
    rec = getRecognizer();
    if (!rec) return alert("Voice input not supported in this browser.");

    listening = true;
    micBtn.classList.add("listening");

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      inputBox.value = transcript;
      if (transcript && transcript.trim()) {
        document.getElementById("chatbot-send")?.click();
      }
    };
    rec.onerror = () => {
      listening = false;
      micBtn.classList.remove("listening");
    };
    rec.onend = () => {
      listening = false;
      micBtn.classList.remove("listening");
    };
    rec.start();
  });

});
