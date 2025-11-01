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

  // 🔗 Replace with your Worker URL (must end with /chatbot)
  const FUNCTION_URL = "https://tiny-firefly-a524.ysmrsink.workers.dev/";

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
});