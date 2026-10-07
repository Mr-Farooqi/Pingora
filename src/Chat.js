import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, push, onValue } from "firebase/database";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const bottomRef = useRef(null);

  // Messages real-time sunna
  useEffect(() => {
    const messagesRef = ref(db, "messages");
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data);
        setMessages(list);
      }
    });
  }, []);

  // Auto scroll neeche
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Message bhejna
  const sendMessage = () => {
    if (newMessage.trim() === "") return;
    push(ref(db, "messages"), {
      text: newMessage,
      user: username,
      time: new Date().toLocaleTimeString()
    });
    setNewMessage("");
  };

  // Enter key se bhejna
  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  if (!joined) {
    return (
      <div style={styles.joinBox}>
        <h2>💬 Chat Room mein aao</h2>
        <input
          placeholder="Apna naam likho..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />
        <button
          onClick={() => username.trim() && setJoined(true)}
          style={styles.button}
        >
          Join Chat
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>💬 Chat Room — {username}</h2>
      <div style={styles.messageBox}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf: msg.user === username ? "flex-end" : "flex-start",
              background: msg.user === username ? "#0084ff" : "#e5e5ea",
              color: msg.user === username ? "white" : "black"
            }}
          >
            <strong>{msg.user}</strong>: {msg.text}
            <span style={styles.time}> {msg.time}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={styles.inputRow}>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message likho..."
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.button}>Send</button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 500, margin: "20px auto", fontFamily: "sans-serif" },
  header: { textAlign: "center", color: "#333" },
  messageBox: {
    height: 400, overflowY: "auto", border: "1px solid #ddd",
    borderRadius: 10, padding: 10, display: "flex",
    flexDirection: "column", gap: 8, background: "#f9f9f9"
  },
  message: { padding: "8px 12px", borderRadius: 16, maxWidth: "70%", fontSize: 14 },
  time: { fontSize: 10, opacity: 0.7 },
  inputRow: { display: "flex", gap: 8, marginTop: 10 },
  input: { flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 },
  button: { padding: "10px 16px", background: "#0084ff", color: "white", border: "none", borderRadius: 8, cursor: "pointer" },
  joinBox: { maxWidth: 300, margin: "100px auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }
};

export default Chat;