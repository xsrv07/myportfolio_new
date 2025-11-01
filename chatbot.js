document.addEventListener("DOMContentLoaded", async () => {
  const bubble = document.getElementById("chatbot-launcher");
  const windowBox = document.getElementById("chatbot-window");
  const closeBtn = document.getElementById("chatbot-close");
  const msgBox = document.getElementById("chatbot-messages");
  const inputBox = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");
  const typingIndicator = document.getElementById("chatbot-typing");

  let greeted = false;
  let KB = null; // knowledge base JSON

  // Load JSON knowledge file
  async function loadKnowledgeBase() {
    try {
      const res = await fetch("saurav_knowledge_base.json");
      KB = await res.json();
      console.log("Knowledge base loaded ✅");
    } catch (err) {
      console.error("KB Load Error ❌", err);
    }
  }
  loadKnowledgeBase();

  function addMessage(text, sender = "bot") {
    const div = document.createElement("div");
    div.classList.add(sender === "bot" ? "bot-msg" : "user-msg");
    div.innerText = text;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  if (bubble && windowBox) {
    bubble.addEventListener("click", () => {
      windowBox.classList.toggle("chatbot-hidden");
      if (!greeted) {
        setTimeout(() => addMessage("Hello, I’m Mr. X. How may I assist you today?"), 400);
        greeted = true;
      }
    });
  }

  if (closeBtn && windowBox) {
    closeBtn.setAttribute("type", "button");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      windowBox.classList.add("chatbot-hidden");
    });
  }

  if (sendBtn && inputBox) {
    const sendUserMessage = () => {
      const text = inputBox.value.trim();
      if (!text) return;
      addMessage(text, "user");
      inputBox.value = "";
      respondFromKnowledge(text);
    };

    sendBtn.addEventListener("click", sendUserMessage);
    inputBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
      }
    });
  }

  // ✅ Offline local answer (temporary)
  async function respondFromKnowledge(userMsg) {
    typingIndicator.style.display = "block";
    await new Promise(r => setTimeout(r, 500)); // fake thinking delay
    typingIndicator.style.display = "none";

    if (!KB) {
      addMessage("Knowledge base not loaded yet. Please try again.");
      return;
    }

    const msg = userMsg.toLowerCase();

    const greetings = ["hi", "hello", "hey", "hii", "hiii", "hola", "namaste", "good morning", "good evening", "good afternoon"];

    if (greetings.some(g => msg.startsWith(g))) {
    addMessage("Hello! I’m Mr. X. I can assist with details about Saurav’s education, work experience, skills, interests, values, awards, family, or marriage profile. How may I help you?");
    return;
        }

    if (
        msg.includes("about saurav") ||
        msg.includes("who is saurav") ||
        msg.includes("tell me about saurav") ||
        msg.includes("introduce saurav") ||
        msg.includes("what is saurav") ||
        msg.includes("yourself")
        ) {
        addMessage(
            "Saurav is a Firmware and Industrial IoT Engineer with an Executive MBA from IIM Amritsar. He holds a B.E. in Instrumentation & Electronics from Jadavpur University. Professionally, he has worked with Reliance Industries and Cognizant (for Schneider Electric) as a Product and Firmware Test Specialist. He’s analytical, calm, and disciplined — passionate about technology, strategy, and personal growth. He values humility, balance, and long-term purposeful living."
        );
        return;
        }

    if (msg.includes("education") || msg.includes("study")) {
      const edu = KB.education.map(e => `${e.level}: ${e.institution}`).join("; ");
      addMessage(`Education: ${edu}`);
      return;
    }

    if (msg.includes("experience") || msg.includes("work") || msg.includes("career")) {
      addMessage(`Work experience includes roles at Cognizant (Schneider Electric), Reliance Industries, and IIoT product projects.`);
      return;
    }

    if (msg.includes("skills")) {
      addMessage(`Skills include firmware, embedded systems, MQTT, OPC UA, MODBUS, HART, Power BI, Tableau, and product strategy.`);
      return;
    }

    if (msg.includes("awards") || msg.includes("achievements")) {
      addMessage(`Awards: NSO/IMO Rank 1, 4× R-Samaan (Reliance), Manipal Scholarship (₹30k, 3rd rank).`);
      return;
    }

    if (msg.includes("interests") || msg.includes("hobbies")) {
      addMessage(`Interests include running, photography, sketching, reading, cricket, badminton, chess, pool, and volunteering.`);
      return;
    }

    if (msg.includes("values")) {
      addMessage(`Core values: humility, discipline, compassion, truthfulness, self-control, equanimity, service mindset.`);
      return;
    }

    if (msg.includes("family")) {
      addMessage(`Family: parents with strong values, brother, and maternal grandmother — close-knit & respectful environment.`);
      return;
    }

    if (
  msg.includes("marriage") ||
  msg.includes("marital") ||
  msg.includes("bachelor") ||
  msg.includes("single") ||
  msg.includes("status")
) {
  addMessage('Marital status: Bachelor.\n Marriage intent: Long-term partnership based on shared values, intellectual compatibility, mutual respect, and disciplined peaceful lifestyle.');
  return;
}

    if (msg.includes("diet") || msg.includes("food") || msg.includes("eat")) {
      addMessage(`Diet: eggetarian, consumes dairy, prefers green tea, boiled eggs, paneer, controlled carbs.`);
      return;
    }

    if (msg.includes("location") || msg.includes("relocate")) {
      addMessage(`Currently based in Hyderabad; open to Pune and Gurgaon.`);
      return;
    }

    // default fallback
    addMessage("I can answer about education, work experience, skills, values, awards, interests, family, or marriage details. Please ask specifically.");
  }
});