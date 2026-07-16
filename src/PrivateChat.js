import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, push, onValue, update, remove } from "firebase/database";

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
  const [selectedMsg, setSelectedMsg] = useState(null); // selected message for delete

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
        const list = Object.entries(data)
          .map(([key, val]) => ({ ...val, key }))
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unseen = messages.filter(m => m.sender === otherUid && m.status !== "seen");
    unseen.forEach(m => {
      update(ref(db, `chats/${chatId}/${m.key}`), { status: "seen" });
    });
  }, [messages, otherUid, chatId]);

  useEffect(() => {
    const handleClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  const sendMessage = () => {
    const text = newMessage.trim();
    if (!text) return;
    push(ref(db, "chats/" + chatId), {
      text, sender: myUid,
      senderName: currentUser.displayName,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(), status: "sent", type: "text"
    });
    setNewMessage("");
    setShowEmoji(false);
    inputRef.current?.focus();
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
      } else alert("Upload failed.");
    } catch (err) { alert("Upload error: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // ── Long press handlers ──
  const handleLongPressStart = (msg) => {
    // Sirf apne messages pe delete allow karo
    if (msg.sender !== myUid) return;
    longPressTimer.current = setTimeout(() => {
      setSelectedMsg(msg);
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  // ── Delete message ──
  const deleteMessage = async (forEveryone = false) => {
    if (!selectedMsg) return;
    try {
      if (forEveryone) {
        // Sab ke liye delete — Firebase se remove
        await remove(ref(db, `chats/${chatId}/${selectedMsg.key}`));
      } else {
        // Sirf apne liye — "deleted" mark karo
        await update(ref(db, `chats/${chatId}/${selectedMsg.key}`), {
          deletedFor: { [myUid]: true }
        });
      }
    } catch (err) {
      alert("Delete error: " + err.message);
    }
    setSelectedMsg(null);
  };

  const grouped = messages.map((msg, i) => ({
    ...msg,
    isSameSender: i > 0 && messages[i - 1].sender === msg.sender
  }));

  return (
    <div style={S.root}>

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
            <span style={{ fontWeight: 600, color: "#555" }}>{selectedUser.name}</span>
            <span style={{ fontSize: 13, color: "#aaa" }}>Pehla message bhejo!</span>
          </div>
        )}

        {grouped.map((msg, i) => {
          const isMe = msg.sender === myUid;
          const isImage = msg.type === "image" && msg.imageUrl;
          const isDeletedForMe = msg.deletedFor?.[myUid];
          const isSelected = selectedMsg?.key === msg.key;

          // Sirf apne liye deleted messages hide karo
          if (isDeletedForMe) return null;

          return (
            <div key={msg.key || i} style={{
              display: "flex",
              justifyContent: isMe ? "flex-end" : "flex-start",
              alignItems: "flex-end",
              gap: 6,
              marginTop: msg.isSameSender ? 2 : 10,
              paddingLeft: isMe ? 52 : 0,
              paddingRight: isMe ? 0 : 52,
            }}>
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

              {/* Image message */}
              {isImage ? (
                <div
                  style={{
                    ...S.imageBubble,
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    boxShadow: isSelected
                      ? "0 0 0 3px #0084ff"
                      : isMe ? "0 2px 8px rgba(0,100,255,.25)" : "0 1px 4px rgba(0,0,0,.12)",
                    opacity: isSelected ? 0.85 : 1,
                  }}
                  onMouseDown={() => handleLongPressStart(msg)}
                  onMouseUp={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(msg)}
                  onTouchEnd={handleLongPressEnd}
                >
                  <img
                    src={msg.imageUrl} alt="shared"
                    style={S.sharedImg}
                    onClick={() => !selectedMsg && setPreviewImg(msg.imageUrl)}
                  />
                  <div style={{ ...S.imgTime, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <span style={{ color: "#aaa", fontSize: 10 }}>{msg.time}</span>
                    {isMe && <Ticks status={msg.status} />}
                  </div>
                </div>
              ) : (
                /* Text message */
                <div
                  style={{
                    ...S.bubble,
                    background: isSelected
                      ? (isMe ? "#0060cc" : "#d8e4ff")
                      : isMe ? "linear-gradient(135deg,#0084ff,#0052cc)" : "#fff",
                    color: isMe ? "#fff" : "#111",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    boxShadow: isSelected
                      ? "0 0 0 3px #0084ff"
                      : isMe ? "0 2px 8px rgba(0,100,255,.25)" : "0 1px 4px rgba(0,0,0,.08)",
                    transition: "all 0.15s",
                  }}
                  onMouseDown={() => handleLongPressStart(msg)}
                  onMouseUp={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(msg)}
                  onTouchEnd={handleLongPressEnd}
                >
                  <span style={S.bText}>{msg.text}</span>
                  <span style={{ ...S.bTime, color: isMe ? "rgba(255,255,255,.6)" : "#ccc" }}>
                    {msg.time}
                    {isMe && <Ticks status={msg.status} />}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {uploading && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <div style={S.uploadingBubble}>
              <div style={S.uploadingSpinner} />
              <span>Uploading...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: 10 }} />
      </div>

      {/* EMOJI PICKER */}
      {showEmoji && (
        <div ref={emojiRef} style={S.emojiPicker}>
          <div style={S.emojiTabs}>
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                ...S.emojiTab,
                background: activeCategory === cat ? "#e8f0fe" : "transparent",
                borderBottom: activeCategory === cat ? "2px solid #0084ff" : "2px solid transparent",
              }}>
                {cat.split(" ")[0]}
              </button>
            ))}
          </div>
          <div style={S.emojiGrid}>
            {EMOJI_CATEGORIES[activeCategory].map((emoji, i) => (
              <button key={i} onClick={() => addEmoji(emoji)} style={S.emojiBtn}>{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {/* INPUT BAR */}
      <div style={S.inputBar}>
        <button onClick={() => setShowEmoji(prev => !prev)} style={{ ...S.iconBtn, background: showEmoji ? "#e8f0fe" : "transparent", color: showEmoji ? "#0084ff" : "#aaa" }}>😊</button>
        <button onClick={() => imageInputRef.current?.click()} style={{ ...S.iconBtn, color: "#aaa", fontSize: 20 }} disabled={uploading}>🖼️</button>
        <input type="file" accept="image/*" ref={imageInputRef} style={{ display: "none" }} onChange={handleImageUpload} />
        <input ref={inputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} onFocus={() => setShowEmoji(false)} placeholder="Message likho..." style={S.input} />
        <button onClick={sendMessage} style={{ ...S.sendBtn, background: newMessage.trim() ? "linear-gradient(135deg,#0084ff,#0052cc)" : "#e5e5e5" }}>
          <span style={{ color: newMessage.trim() ? "white" : "#bbb", fontSize: 18 }}>➤</span>
        </button>
      </div>

      {/* DELETE MODAL */}
      {selectedMsg && (
        <div style={S.deleteOverlay} onClick={() => setSelectedMsg(null)}>
          <div style={S.deleteModal} onClick={e => e.stopPropagation()}>
            <div style={S.deleteTitle}>🗑️ Message Delete karo</div>
            <div style={S.deleteSubt}>Kaise delete karna hai?</div>

            <button onClick={() => deleteMessage(true)} style={S.deleteBtnRed}>
              🗑️ Sab ke liye Delete
              <span style={S.deleteBtnSub}>Dono ke chat se hata do</span>
            </button>

            <button onClick={() => deleteMessage(false)} style={S.deleteBtnGrey}>
              👤 Sirf mere liye Delete
              <span style={S.deleteBtnSub}>Sirf meri chat se hata do</span>
            </button>

            <button onClick={() => setSelectedMsg(null)} style={S.cancelBtn}>
              Cancel
            </button>
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

const S = {
  root: { display: "flex", flexDirection: "column", height: "100%", width: "100%", background: "#f0f2f5", overflow: "hidden", contain: "strict" },
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
  bubble: { maxWidth: "100%", padding: "9px 13px", display: "inline-flex", alignItems: "flex-end", gap: 6, wordBreak: "break-word", userSelect: "none", cursor: "pointer" },
  bText: { fontSize: 15, lineHeight: 1.45, wordBreak: "break-word", whiteSpace: "pre-wrap" },
  bTime: { fontSize: 10, flexShrink: 0, marginBottom: 1, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" },
  imageBubble: { background: "#fff", overflow: "hidden", maxWidth: 220, cursor: "pointer", userSelect: "none" },
  sharedImg: { width: "100%", maxWidth: 220, maxHeight: 260, objectFit: "cover", display: "block" },
  imgTime: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" },
  uploadingBubble: { background: "rgba(0,132,255,.1)", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#0084ff" },
  uploadingSpinner: { width: 16, height: 16, borderRadius: "50%", border: "2px solid #0084ff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" },
  emojiPicker: { flexShrink: 0, background: "#fff", borderTop: "1px solid #eee", boxShadow: "0 -4px 16px rgba(0,0,0,.08)", zIndex: 5, height: 260, display: "flex", flexDirection: "column" },
  emojiTabs: { display: "flex", overflowX: "auto", flexShrink: 0, borderBottom: "1px solid #f0f0f0", padding: "4px 8px 0", gap: 2 },
  emojiTab: { border: "none", padding: "6px 10px", fontSize: 18, cursor: "pointer", borderRadius: "8px 8px 0 0", flexShrink: 0 },
  emojiGrid: { flex: 1, overflowY: "auto", display: "flex", flexWrap: "wrap", padding: "8px", gap: 2 },
  emojiBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 },
  inputBar: { position: "sticky", bottom: 0, zIndex: 10, flexShrink: 0, display: "flex", gap: 6, padding: "10px", background: "#fff", borderTop: "1px solid #eee", alignItems: "center", minHeight: 62, boxShadow: "0 -2px 8px rgba(0,0,0,.05)" },
  iconBtn: { width: 38, height: 38, borderRadius: "50%", border: "none", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "transparent" },
  input: { flex: 1, padding: "11px 14px", borderRadius: 24, border: "1.5px solid #e0e0e0", fontSize: 16, outline: "none", background: "#f8f9fb", minWidth: 0 },
  sendBtn: { width: 44, height: 44, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" },

  // Delete modal
  deleteOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(2px)" },
  deleteModal: { background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 420, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 -8px 30px rgba(0,0,0,.2)", animation: "slideUp 0.3s ease" },
  deleteTitle: { fontSize: 17, fontWeight: 700, color: "#1a1a1a", textAlign: "center" },
  deleteSubt: { fontSize: 13, color: "#aaa", textAlign: "center", marginBottom: 4 },
  deleteBtnRed: { display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "14px 16px", background: "#fff1f1", border: "1px solid #ffd5d5", borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#ff4444", gap: 2 },
  deleteBtnGrey: { display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "14px 16px", background: "#f5f5f5", border: "1px solid #e8e8e8", borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#555", gap: 2 },
  deleteBtnSub: { fontSize: 12, fontWeight: 400, color: "#aaa" },
  cancelBtn: { padding: "13px", background: "white", border: "1px solid #eee", borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#888", textAlign: "center" },

  // Preview
  previewOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  previewClose: { position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "white", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  previewImg: { maxWidth: "95vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 },
  downloadBtn: { marginTop: 16, padding: "10px 24px", background: "#0084ff", color: "white", borderRadius: 12, textDecoration: "none", fontSize: 14, fontWeight: 600 },
};

export default PrivateChat;
