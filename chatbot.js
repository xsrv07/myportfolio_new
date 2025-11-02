// chatbot.js — Pure AI (Cloudflare Worker backend)

// create a stable per-browser session id and store it
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
  const bubble = document.getElementById("chatbot-launcher");
  const windowBox = document.getElementById("chatbot-window");
  const closeBtn = document.getElementById("chatbot-close");
  const msgBox = document.getElementById("chatbot-messages");
  const inputBox = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");
  const typingIndicator = document.getElementById("chatbot-typing");

  // 🔗 Replace with your Worker URL 
  const FUNCTION_URL = "https://tiny-firefly-a524.ysmrsink.workers.dev/chatbot";

  let greeted = false;
  let sending = false;

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

  // Open/close
  if (bubble && windowBox) {
    bubble.addEventListener("click", () => {
      windowBox.classList.toggle("chatbot-hidden");
      if (!greeted) {
        setTimeout(() => addMessage("Hello, I’m Mr. X. How may I assist you today?"), 400);
        greeted = true;
      }
      inputBox?.focus();
    });
  }

  if (closeBtn && windowBox) {
    closeBtn.setAttribute("type", "button");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      windowBox.classList.add("chatbot-hidden");
    });
  }

  // Send handlers
  if (sendBtn && inputBox) {
    const sendUserMessage = () => {
      const text = inputBox.value.trim();
      if (!text || sending) return;
      addMessage(text, "user");
      inputBox.value = "";
      callBackend(text);
    };

    sendBtn.addEventListener("click", sendUserMessage);
    inputBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
      }
    });
  }

  // 🔥 Pure AI: everything goes to backend
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

      // Network OK but backend error?
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        addMessage("Sorry, there was a problem on the server. Please try again.");
        console.error("Backend HTTP error:", res.status, detail);
      } else {
        const data = await res.json();
        addMessage(data.reply || "Sorry, I couldn’t generate a response.");
        try { speak(data.reply); } catch {}
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
  // ---- Clear Chat (UI + server) ----
async function clearChatOnServer() {
  try {
    // Call your Worker /clear endpoint (added below in Worker patch)
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
  // optional: reset greeting so bot greets again next open
  greeted = false;
}

document.getElementById("chatbot-clear")?.addEventListener("click", async () => {
  // Visual confirmation could be added here
  await clearChatOnServer();
  clearChatUI();
  addMessage("Chat cleared.", "bot");
});
// ---- Voice: TTS (speak text) ----
function speak(text) {
  try {
    if (!window.speechSynthesis) return alert("Speech not supported in this browser.");
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;        // tweak if needed
    utter.pitch = 1;
    utter.lang = "en-IN";  // or "en-US"
    speechSynthesis.cancel(); // stop previous
    speechSynthesis.speak(utter);
  } catch (e) {
    console.warn("TTS error", e);
  }
}

// Speak last bot message
document.getElementById("chatbot-speak")?.addEventListener("click", () => {
  const bots = [...msgBox.querySelectorAll(".bot-msg")];
  if (bots.length === 0) return;
  const last = bots[bots.length - 1].innerText;
  speak(last);
});

// ---- Voice: STT (mic → textarea) ----
let rec = null;
let listening = false;

function getRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "en-IN";     // tweak language
  r.interimResults = false;
  r.maxAlternatives = 1;
  return r;
}

const micBtn = document.getElementById("chatbot-mic");
if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (listening) {
      rec?.stop();
      return;
    }
    rec = getRecognizer();
    if (!rec) return alert("Voice input not supported on this browser.");
    listening = true;
    micBtn.classList.add("listening");

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      inputBox.value = transcript;
      // auto-send after dictation (optional)
      if (transcript && transcript.trim()) {
        // simulate Send
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
}
});