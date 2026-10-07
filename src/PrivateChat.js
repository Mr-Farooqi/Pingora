import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { useTheme } from "./ThemeContext";

const EMOJI_CATEGORIES = {
  "😊 Smileys": ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓"],
  "👍 Gestures": ["👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👋","🤚","🖐","✋","🖖","👏","🙌","🤲","🤝","🙏","✍️","💪","🦵","🦶","👂","👃","👀","👁","👅","👄"],
  "❤️ Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☯️","🔥","💯","✨","⭐","🌟","💫","⚡","🎉","🎊","🎈"],
  "😸 Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈"],
  "🍕 Food": ["🍕","🍔","🍟","🌭","🍿","🧂","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌮","🌯","🥙","🧆","🥚","🥗","🥘","🍲","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍙","🍚","🍘","🍥","🥮","🍡","🧁","🎂","🍰","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🍶","🍺","🍻","🥂","🍷"],
  "🎮 Fun": ["🎮","🕹","🎲","🎯","🎳","🎰","🎭","🎨","🖼","🎪","🎤","🎧","🎵","🎶","🎸","🎹","🥁","🎺","🎻","🪕","🎼","🎬","🎥","📷","📸","📹","🎞","📽","🎦","📺","📻","🎙","🎚","🎛","📱","💻","⌨️","🖥","🖨","🖱","🖲","💾","💿","📀","📠"],
};

function PrivateChat({ currentUser, selectedUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCategory, setActiveCategory] = useState("😊 Smileys");
  const [uploading, setUploading] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const { isDark } = useTheme();
  const T = isDark ? dark : light;

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const emojiRef = useRef(null);
  const imageInputRef = useRef(null);
  const longPressTimer = useRef(null);

  const myUid = currentUser.uid;
  const otherUid = selectedUser.uid;
  const chatId = [myUid, otherUid].sort().join("_");

  useEffect(() => {
    const unsub = onValue(ref(db, "chats/" + chatId), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([key, val]) => ({ ...val, key }))
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(list);
      } else setMessages([]);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    const unsub = onValue(ref(db, "status/" + otherUid), (snap) => {
      setIsOnline(snap.val()?.state === "online");
    });
    return () => unsub();
  }, [otherUid]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const unseen = messages.filter(m => m.sender === otherUid && m.status !== "seen");
    unseen.forEach(m => update(ref(db, `chats/${chatId}/${m.key}`), { status: "seen" }));
  }, [messages, otherUid, chatId]);

  useEffect(() => {
    const handleClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("touchstart", handleClick); };
  }, []);

  const handlePressStart = (msg) => {
    if (msg.sender !== myUid) return;
    longPressTimer.current = setTimeout(() => setSelectedMsg(msg), 500);
  };
  const handlePressEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const deleteMessage = async (forEveryone) => {
    if (!selectedMsg) return;
    try {
      if (forEveryone) await remove(ref(db, `chats/${chatId}/${selectedMsg.key}`));
      else await update(ref(db, `chats/${chatId}/${selectedMsg.key}`), { deletedFor: myUid, text: "" });
    } catch (err) { alert("Delete nahi hua: " + err.message); }
    setSelectedMsg(null);
  };

  const sendMessage = () => {
    const text = newMessage.trim();
    if (!text) return;
    push(ref(db, "chats/" + chatId), {
      text, sender: myUid, senderName: currentUser.displayName,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(), status: "sent", type: "text"
    });
    setNewMessage(""); setShowEmoji(false); inputRef.current?.focus();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image 5MB se badi hai!"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "al56gwiy");
      formData.append("cloud_name", "dfjwiq6vv");
      const res = await fetch("https://api.cloudinary.com/v1_1/dfjwiq6vv/image/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) {
        push(ref(db, "chats/" + chatId), {
          text: "", imageUrl: data.secure_url, sender: myUid,
          senderName: currentUser.displayName,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(), status: "sent", type: "image"
        });
      }
    } catch (err) { alert("Upload error: " + err.message); }
    setUploading(false); e.target.value = "";
  };

  const grouped = messages.map((msg, i) => ({
    ...msg, isSameSender: i > 0 && messages[i - 1].sender === msg.sender
  }));

  return (
    <div style={{ ...S.root, background: T.bg }}>

      {/* HEADER */}
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>‹</button>
        <div style={S.hAvatarWrap}>
          {selectedUser.photoURL
            ? <img src={selectedUser.photoURL} alt="" style={S.hAvatar} />
            : <div style={{ ...S.hAvatarFb, background: color(selectedUser.name) }}>
                {selectedUser.name?.[0]?.toUpperCase()}
              </div>
          }
          <span style={{ ...S.dot, background: isOnline ? "#44d62c" : "#bbb" }} />
        </div>
        <div style={S.hInfo}>
          <div style={S.hName}>{selectedUser.name}</div>
          <div style={{ ...S.hStatus, color: isOnline ? "#9effa0" : "rgba(255,255,255,.55)" }}>
            {isOnline ? "🟢 Online" : "⚫ Offline"}
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={S.body}>
        {messages.length === 0 && (
          <div style={S.empty}>
            <span style={{ fontSize: 44 }}>👋</span>
            <span style={{ fontWeight: 600, color: T.text }}>{selectedUser.name}</span>
            <span style={{ fontSize: 13, color: T.sub }}>Pehla message bhejo!</span>
          </div>
        )}
        {grouped.map((msg, i) => {
          const isMe = msg.sender === myUid;
          const isImage = msg.type === "image" && msg.imageUrl;
          const isDeleted = msg.deletedFor === myUid;
          const isSelected = selectedMsg?.key === msg.key;
          if (isDeleted && !msg.imageUrl) return null;

          return (
            <div key={msg.key || i} style={{
              display: "flex", justifyContent: isMe ? "flex-end" : "flex-start",
              alignItems: "flex-end", gap: 6,
              marginTop: msg.isSameSender ? 2 : 10,
              paddingLeft: isMe ? 52 : 0, paddingRight: isMe ? 0 : 52,
            }}
              onMouseDown={() => handlePressStart(msg)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(msg)} onTouchEnd={handlePressEnd}
            >
              {!isMe && (
                <div style={{ width: 30, flexShrink: 0 }}>
                  {!msg.isSameSender && (
                    selectedUser.photoURL
                      ? <img src={selectedUser.photoURL} style={S.msgAv} alt="" />
                      : <div style={{ ...S.msgAvFb, background: color(selectedUser.name) }}>
                          {selectedUser.name?.[0]?.toUpperCase()}
                        </div>
                  )}
                </div>
              )}

              {isImage ? (
                <div style={{
                  ...S.imageBubble,
                  background: T.card,
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  boxShadow: isSelected ? "0 0 0 3px #ff4444" : "0 1px 4px rgba(0,0,0,.15)"
                }}>
                  <img src={msg.imageUrl} alt="shared" style={S.sharedImg} onClick={() => !selectedMsg && setPreviewImg(msg.imageUrl)} />
                  <div style={{ ...S.imgTime, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <span style={{ color: T.sub, fontSize: 10 }}>{msg.time}</span>
                    {isMe && <Ticks status={msg.status} />}
                  </div>
                </div>
              ) : (
                <div style={{
                  ...S.bubble,
                  background: isSelected ? (isDark ? "#2a1a1a" : "#ffebee")
                    : isMe ? "linear-gradient(135deg,#0084ff,#0052cc)" : T.card,
                  color: isMe && !isSelected ? "#fff" : T.text,
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  boxShadow: isSelected ? "0 0 0 2px #ff4444"
                    : isMe ? "0 2px 8px rgba(0,100,255,.25)" : `0 1px 4px rgba(0,0,0,${isDark ? ".3" : ".08"})`
                }}>
                  <span style={S.bText}>{msg.text}</span>
                  <span style={{ ...S.bTime, color: isMe && !isSelected ? "rgba(255,255,255,.6)" : T.sub }}>
                    {msg.time}{isMe && <Ticks status={msg.status} />}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {uploading && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <div style={S.uploadingBubble}>
              <div style={S.uploadingSpinner} /><span>Uploading...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 10 }} />
      </div>

      {/* EMOJI PICKER */}
      {showEmoji && (
        <div ref={emojiRef} style={{ ...S.emojiPicker, background: T.card, borderTop: `1px solid ${T.border}` }}>
          <div style={{ ...S.emojiTabs, borderBottom: `1px solid ${T.border}` }}>
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                ...S.emojiTab,
                background: activeCategory === cat ? (isDark ? "#1a2a3a" : "#e8f0fe") : "transparent",
                borderBottom: activeCategory === cat ? "2px solid #0084ff" : "2px solid transparent",
              }}>
                {cat.split(" ")[0]}
              </button>
            ))}
          </div>
          <div style={S.emojiGrid}>
            {EMOJI_CATEGORIES[activeCategory].map((emoji, i) => (
              <button key={i} onClick={() => { setNewMessage(p => p + emoji); inputRef.current?.focus(); }} style={S.emojiBtn}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INPUT BAR */}
      <div style={{ ...S.inputBar, background: T.card, borderTop: `1px solid ${T.border}` }}>
        <button onClick={() => setShowEmoji(p => !p)} style={{ ...S.iconBtn, background: showEmoji ? (isDark ? "#1a2a3a" : "#e8f0fe") : "transparent", color: showEmoji ? "#0084ff" : T.sub }}>
          😊
        </button>
        <button onClick={() => imageInputRef.current?.click()} style={{ ...S.iconBtn, color: T.sub, fontSize: 20 }} disabled={uploading}>
          🖼️
        </button>
        <input type="file" accept="image/*" ref={imageInputRef} style={{ display: "none" }} onChange={handleImageUpload} />
        <input
          ref={inputRef} value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          onFocus={() => setShowEmoji(false)}
          placeholder="Message likho..."
          style={{ ...S.input, background: T.inputBg, color: T.text, border: `1.5px solid ${T.border}` }}
        />
        <button onClick={sendMessage} style={{
          ...S.sendBtn,
          background: newMessage.trim() ? "linear-gradient(135deg,#0084ff,#0052cc)" : (isDark ? "#2a2a2a" : "#e5e5e5")
        }}>
          <span style={{ color: newMessage.trim() ? "white" : T.sub, fontSize: 18 }}>➤</span>
        </button>
      </div>

      {/* DELETE MENU */}
      {selectedMsg && (
        <div style={S.deleteOverlay} onClick={() => setSelectedMsg(null)}>
          <div style={{ ...S.deleteMenu, background: T.card }} onClick={e => e.stopPropagation()}>
            <div style={S.deleteHeader}>
              <span style={{ ...S.deleteTitle, color: T.text }}>🗑️ Message Delete karo</span>
              <span style={{ ...S.deletePreview, color: T.sub }}>
                {selectedMsg.type === "image" ? "📷 Photo" : selectedMsg.text?.slice(0, 40)}
              </span>
            </div>
            <button onClick={() => deleteMessage(true)} style={S.deleteForAll}>🗑️ Sab ke liye delete karo</button>
            <button onClick={() => deleteMessage(false)} style={S.deleteForMe}>👤 Sirf mere liye delete karo</button>
            <button onClick={() => setSelectedMsg(null)} style={{ ...S.cancelBtn, background: isDark ? "#2a2a2a" : "#f5f5f5", color: T.sub }}>✕ Cancel</button>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW */}
      {previewImg && (
        <div style={S.previewOverlay} onClick={() => setPreviewImg(null)}>
          <button style={S.previewClose} onClick={() => setPreviewImg(null)}>✕</button>
          <img src={previewImg} alt="preview" style={S.previewImg} />
          <a href={previewImg} download target="_blank" rel="noreferrer" style={S.downloadBtn} onClick={e => e.stopPropagation()}>
            ⬇️ Download
          </a>
        </div>
      )}
    </div>
  );
}

function Ticks({ status }) {
  if (status === "seen") return (
    <svg width="16" height="11" viewBox="0 0 16 11" style={{ marginLeft: 3, verticalAlign: "middle" }}>
      <path d="M0.5 5.5L3.5 8.5L9 2" stroke="#4fc3f7" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5.5L8 8.5L15 1" stroke="#4fc3f7" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === "delivered") return (
    <svg width="16" height="11" viewBox="0 0 16 11" style={{ marginLeft: 3, verticalAlign: "middle" }}>
      <path d="M0.5 5.5L3.5 8.5L9 2" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5.5L8 8.5L15 1" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" style={{ marginLeft: 3, verticalAlign: "middle" }}>
      <path d="M1 5.5L4 8.5L11.5 1" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function color(str = "") {
  const list = ["#0084ff","#e91e63","#9c27b0","#ff5722","#009688","#ff9800","#3f51b5"];
  let h = 0;
  for (let c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return list[Math.abs(h) % list.length];
}

const light = { bg: "#f0f2f5", card: "#fff", text: "#111", sub: "#aaa", border: "#eee", inputBg: "#f8f9fb" };
const dark  = { bg: "#0f0f0f", card: "#1a1a1a", text: "#f0f0f0", sub: "#555", border: "#2a2a2a", inputBg: "#222" };

const S = {
  root: { display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", contain: "strict" },
  header: { position: "sticky", top: 0, zIndex: 10, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", minHeight: 62, background: "linear-gradient(135deg,#0084ff 0%,#0052cc 100%)", boxShadow: "0 2px 10px rgba(0,100,255,.3)" },
  backBtn: { flexShrink: 0, width: 38, height: 38, background: "rgba(255,255,255,.18)", border: "none", borderRadius: 10, color: "white", fontSize: 28, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
  hAvatarWrap: { position: "relative", flexShrink: 0 },
  hAvatar: { width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,.4)" },
  hAvatarFb: { width: 42, height: 42, borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, border: "2px solid rgba(255,255,255,.4)" },
  dot: { position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", border: "2px solid #0052cc" },
  hInfo: { flex: 1, minWidth: 0 },
  hName: { color: "white", fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hStatus: { fontSize: 12, marginTop: 1 },
  body: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px", WebkitOverflowScrolling: "touch" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 200, marginTop: 40 },
  msgAv: { width: 28, height: 28, borderRadius: "50%", objectFit: "cover" },
  msgAvFb: { width: 28, height: 28, borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  bubble: { maxWidth: "100%", padding: "9px 13px", display: "inline-flex", alignItems: "flex-end", gap: 6, wordBreak: "break-word", userSelect: "none" },
  bText: { fontSize: 15, lineHeight: 1.45, wordBreak: "break-word", whiteSpace: "pre-wrap" },
  bTime: { fontSize: 10, flexShrink: 0, marginBottom: 1, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" },
  imageBubble: { overflow: "hidden", maxWidth: 220 },
  sharedImg: { width: "100%", maxWidth: 220, maxHeight: 260, objectFit: "cover", display: "block", cursor: "pointer" },
  imgTime: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" },
  uploadingBubble: { background: "rgba(0,132,255,.1)", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#0084ff" },
  uploadingSpinner: { width: 16, height: 16, borderRadius: "50%", border: "2px solid #0084ff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" },
  emojiPicker: { flexShrink: 0, zIndex: 5, height: 260, display: "flex", flexDirection: "column" },
  emojiTabs: { display: "flex", overflowX: "auto", flexShrink: 0, padding: "4px 8px 0", gap: 2 },
  emojiTab: { border: "none", padding: "6px 10px", fontSize: 18, cursor: "pointer", borderRadius: "8px 8px 0 0", flexShrink: 0 },
  emojiGrid: { flex: 1, overflowY: "auto", display: "flex", flexWrap: "wrap", padding: "8px", gap: 2, WebkitOverflowScrolling: "touch" },
  emojiBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 },
  inputBar: { position: "sticky", bottom: 0, zIndex: 10, flexShrink: 0, display: "flex", gap: 6, padding: "10px", alignItems: "center", minHeight: 62, boxShadow: "0 -2px 8px rgba(0,0,0,.05)" },
  iconBtn: { width: 38, height: 38, borderRadius: "50%", border: "none", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" },
  input: { flex: 1, padding: "11px 14px", borderRadius: 24, fontSize: 16, outline: "none", minWidth: 0 },
  sendBtn: { width: 44, height: 44, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "background 0.2s" },
  deleteOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  deleteMenu: { width: "100%", maxWidth: 420, borderRadius: "20px 20px 0 0", padding: "20px 16px 32px", display: "flex", flexDirection: "column", gap: 10, animation: "slideUp 0.25s ease" },
  deleteHeader: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 6, padding: "0 4px" },
  deleteTitle: { fontWeight: 700, fontSize: 16 },
  deletePreview: { fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  deleteForAll: { padding: "14px", background: "#fff1f1", color: "#ff3b30", border: "1px solid #ffd5d5", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "center" },
  deleteForMe: { padding: "14px", background: "#f5f7ff", color: "#0084ff", border: "1px solid #d0e4ff", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "center" },
  cancelBtn: { padding: "14px", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "center" },
  previewOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  previewClose: { position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "white", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  previewImg: { maxWidth: "95vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 },
  downloadBtn: { marginTop: 16, padding: "10px 24px", background: "#0084ff", color: "white", borderRadius: 12, textDecoration: "none", fontSize: 14, fontWeight: 600 },
};

export default PrivateChat;
