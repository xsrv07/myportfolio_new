document.addEventListener("DOMContentLoaded", () => {

  // =================== UI ELEMENTS ===================
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

  // =================== BACKEND URL ===================
  const FUNCTION_URL = "https://YOUR-CLOUDFLARE-WORKER-URL/chatbot";

  // =================== SESSION ID (per user) ===================
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

  // =================== BASIC CHAT UI ===================
  let greeted = false;

  function addMessage(text, sender = "bot") {
    const div = document.createElement("div");
    div.classList.add(sender === "bot" ? "bot-msg" : "user-msg");
    div.innerText = text;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  // Toggle open
  bubble?.addEventListener("click", () => {
    windowBox.classList.toggle("chatbot-hidden");
    if (!greeted) {
      setTimeout(() =>
        addMessage("Hello, I’m Mr. X. How may I assist you today?"), 300);
      greeted = true;
    }
  });

  // Close button
  closeBtn?.addEventListener("click", () => {
    windowBox.classList.add("chatbot-hidden");
  });

  // =================== SEND MESSAGE ===================
  function sendUserMessage() {
    const text = inputBox.value.trim();
    if (!text) return;
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

  // =================== CALL BACKEND ===================
  async function callBackend(userMsg) {
    typingIndicator.style.display = "block";
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, sessionId: SESSION_ID })
      });
      const data = await res.json();
      typingIndicator.style.display = "none";
      addMessage(data.reply);
      if (voiceEnabled) safeSpeak(data.reply);
    } catch (err) {
      typingIndicator.style.display = "none";
      addMessage("Sorry, there was a problem. Please try again later.");
    }
  }

  // =================== CLEAR CHAT ===================
  async function clearChatOnServer() {
    try {
      await fetch(FUNCTION_URL.replace("/chatbot", "/clear"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID })
      });
    } catch (e) {}
  }

  clearBtn?.addEventListener("click", async () => {
    await clearChatOnServer();
    msgBox.innerHTML = "";
    addMessage("Chat cleared.", "bot");
    greeted = false;
  });

  // =================== TEXT TO SPEECH (VOICE OUTPUT) ===================
  let voiceEnabled = false;

  function updateVoiceIcon() {
    if (!voiceToggleBtn) return;
    voiceToggleBtn.innerHTML = voiceEnabled
      ? `<i class="bi bi-volume-up"></i>`
      : `<i class="bi bi-volume-mute"></i>`;
    voiceToggleBtn.title = voiceEnabled ? "Voice ON" : "Voice OFF";
  }

  function safeSpeak(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";
    utter.rate = 1;
    speechSynthesis.speak(utter);
  }

  voiceToggleBtn?.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled && window.speechSynthesis) speechSynthesis.cancel();
    updateVoiceIcon();
  });

  updateVoiceIcon();

  // =================== VOICE INPUT (MIC) ===================
  let rec = null;
  let listening = false;

  function speechSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function createRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    return r;
  }

  async function ensureMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  micBtn?.addEventListener("click", async () => {
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      alert("Voice input needs HTTPS.");
      return;
    }
    if (!speechSupported()) {
      alert("Voice input not supported in this browser. Use Chrome.");
      return;
    }
    if (listening) {
      rec?.stop();
      return;
    }

    const ok = await ensureMicPermission();
    if (!ok) {
      alert("Microphone permission denied.");
      return;
    }

    rec = createRecognizer();
    listening = true;
    micBtn.classList.add("listening");

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      inputBox.value = transcript;
      sendUserMessage();
    };
    rec.onend = () => {
      listening = false;
      micBtn.classList.remove("listening");
    };
    rec.start();
  });

});