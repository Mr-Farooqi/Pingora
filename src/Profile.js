import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ref as dbRef, update, onValue } from "firebase/database";

function Profile({ currentUser, onClose }) {
  const [name, setName] = useState(currentUser.displayName || "");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState("info"); // info | security

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileRef = useRef();

  useEffect(() => {
    const userRef = dbRef(db, "users/" + currentUser.uid);
    onValue(userRef, (snap) => {
      const data = snap.val();
      if (data) {
        setBio(data.bio || "");
        setPhone(data.phone || "");
        setPhotoURL(data.photoURL || currentUser.photoURL || "");
      }
    }, { onlyOnce: true });
  }, [currentUser]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "al56gwiy");
      formData.append("cloud_name", "dfjwiq6vv");

      const res = await fetch("https://api.cloudinary.com/v1_1/dfjwiq6vv/image/upload", {
        method: "POST", body: formData
      });
      const data = await res.json();
      if (data.secure_url) setPhotoURL(data.secure_url);
      else alert("Upload failed. Cloudinary config check karo.");
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeSection === "security" && newPassword) {
        if (newPassword.length < 6) {
          alert("Password kam az kam 6 characters ka hona chahiye!");
          setSaving(false); return;
        }
        if (newPassword !== confirmPassword) {
          alert("Dono passwords match nahi kar rahe!");
          setSaving(false); return;
        }
        if (!currentPassword) {
          alert("Pehle current password daalo!");
          setSaving(false); return;
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
      }

      await updateProfile(auth.currentUser, { displayName: name, photoURL });
      await update(dbRef(db, "users/" + currentUser.uid), { name, bio, phone, photoURL });

      setSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => { setSuccess(false); onClose(); }, 1300);
    } catch (err) {
      if (err.code === "auth/wrong-password") alert("Current password galat hai!");
      else if (err.code === "auth/requires-recent-login") alert("Pehle logout/login karke try karo.");
      else alert("Error: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* ── COVER / HERO ── */}
        <div style={S.hero}>
          <button onClick={onClose} style={S.closeBtn}>✕</button>

          <div style={S.heroAvatarWrap}>
            <div style={S.avatarRing}>
              {photoURL
                ? <img src={photoURL} alt="" style={S.avatarImg} />
                : <div style={S.avatarFb}>{name ? name[0].toUpperCase() : "?"}</div>
              }
            </div>
            <button style={S.cameraBtn} onClick={() => fileRef.current.click()}>
              {uploading ? "⏳" : "📷"}
            </button>
            <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handlePhotoUpload} />
          </div>

          <div style={S.heroName}>{name || "Your name"}</div>
          <div style={S.heroEmail}>{currentUser.email}</div>
        </div>

        {/* ── TAB SWITCHER ── */}
        <div style={S.tabs}>
          <button
            style={{ ...S.tabBtn, ...(activeSection === "info" ? S.tabActive : {}) }}
            onClick={() => setActiveSection("info")}
          >
            👤 Info
          </button>
          <button
            style={{ ...S.tabBtn, ...(activeSection === "security" ? S.tabActive : {}) }}
            onClick={() => setActiveSection("security")}
          >
            🔒 Security
          </button>
        </div>

        {/* ── CONTENT ── */}
        <div style={S.content}>

          {activeSection === "info" && (
            <>
              <Field label="Naam" icon="✏️">
                <input value={name} onChange={e => setName(e.target.value)} style={S.input} placeholder="Apna naam" />
              </Field>

              <Field label="Bio" icon="💭">
                <textarea
                  value={bio} onChange={e => setBio(e.target.value)}
                  style={{ ...S.input, height: 70, resize: "none" }}
                  placeholder="Apne baare mein kuch likho..."
                />
              </Field>

              <Field label="Phone Number" icon="📱">
                <input value={phone} onChange={e => setPhone(e.target.value)} style={S.input} placeholder="+92 300 0000000" />
              </Field>

              <Field label="Email" icon="📧">
                <input value={currentUser.email} disabled style={{ ...S.input, background: "#f5f5f5", color: "#999" }} />
              </Field>
            </>
          )}

          {activeSection === "security" && (
            <>
              <div style={S.securityNote}>
                🔐 Password change karne ke liye apna current password verify karna hoga
              </div>

              <Field label="Current Password" icon="🔑">
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={S.input} placeholder="Purana password" />
              </Field>

              <Field label="Naya Password" icon="🆕">
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={S.input} placeholder="Min 6 characters" />
              </Field>

              <Field label="Confirm Password" icon="✅">
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={S.input} placeholder="Dobara likho" />
              </Field>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={S.footer}>
          {success ? (
            <div style={S.successMsg}>✅ Profile update ho gaya!</div>
          ) : (
            <button onClick={handleSave} disabled={saving} style={S.saveBtn}>
              {saving ? "Saving..." : "💾 Changes Save Karo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>
        <span>{icon}</span> {label}
      </label>
      {children}
    </div>
  );
}

const S = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,.55)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(2px)",
  },
  modal: {
    background: "#f7f8fa",
    borderRadius: "24px 24px 0 0",
    width: "100%", maxWidth: 420,
    maxHeight: "92vh",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    animation: "slideUp 0.3s cubic-bezier(.32,.72,0,1)",
    boxShadow: "0 -8px 30px rgba(0,0,0,.2)",
  },

  hero: {
    position: "relative",
    background: "linear-gradient(135deg, #0084ff 0%, #0052cc 100%)",
    padding: "20px 20px 24px",
    display: "flex", flexDirection: "column", alignItems: "center",
    flexShrink: 0,
  },
  closeBtn: {
    position: "absolute", top: 14, right: 16,
    background: "rgba(255,255,255,.2)", border: "none",
    color: "white", width: 32, height: 32, borderRadius: 10,
    fontSize: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  heroAvatarWrap: { position: "relative", marginTop: 4 },
  avatarRing: {
    width: 96, height: 96, borderRadius: "50%",
    padding: 3, background: "rgba(255,255,255,.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" },
  avatarFb: {
    width: "100%", height: "100%", borderRadius: "50%",
    background: "rgba(255,255,255,.25)", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 36, fontWeight: 700,
  },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: "50%",
    background: "white", border: "3px solid #0052cc",
    fontSize: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  heroName: { color: "white", fontWeight: 800, fontSize: 19, marginTop: 12 },
  heroEmail: { color: "rgba(255,255,255,.75)", fontSize: 12, marginTop: 2 },

  tabs: {
    display: "flex", gap: 0,
    background: "#fff", flexShrink: 0,
    borderBottom: "1px solid #eee",
  },
  tabBtn: {
    flex: 1, padding: "14px 0",
    background: "none", border: "none",
    fontSize: 14, fontWeight: 600, color: "#999",
    cursor: "pointer", position: "relative",
    transition: "color 0.2s",
  },
  tabActive: {
    color: "#0084ff",
    boxShadow: "inset 0 -3px 0 #0084ff",
  },

  content: {
    flex: 1, overflowY: "auto",
    padding: "18px 18px 8px",
    display: "flex", flexDirection: "column", gap: 14,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: {
    fontSize: 12, fontWeight: 700, color: "#777",
    display: "flex", alignItems: "center", gap: 6,
  },
  input: {
    padding: "11px 14px", borderRadius: 12,
    border: "1.5px solid #e6e6e6", fontSize: 14.5,
    outline: "none", background: "#fff",
    fontFamily: "inherit",
  },
  securityNote: {
    background: "#eef6ff", color: "#0066cc",
    fontSize: 12.5, padding: "10px 14px",
    borderRadius: 12, lineHeight: 1.5,
  },

  footer: {
    flexShrink: 0, padding: "14px 18px",
    background: "#fff", borderTop: "1px solid #eee",
  },
  saveBtn: {
    width: "100%", padding: "14px",
    background: "linear-gradient(135deg,#0084ff,#0052cc)",
    color: "white", border: "none", borderRadius: 14,
    fontSize: 15, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,132,255,.35)",
  },
  successMsg: {
    textAlign: "center", padding: "14px",
    background: "#e8f5e9", color: "#2e7d32",
    borderRadius: 14, fontWeight: 700, fontSize: 14,
  },
};

export default Profile;