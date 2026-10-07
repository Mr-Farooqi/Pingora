import React from "react";
import { useTheme } from "./ThemeContext";

function ProfileTab({ user, onEditProfile, onLogout, notifPermission, onEnableNotif }) {
  const { isDark, toggle } = useTheme();

  const T = isDark ? dark : light;

  return (
    <div style={{ ...PT.container, background: T.bg }}>

      {/* Hero */}
      <div style={PT.hero}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={PT.avatar} />
          : <div style={PT.avatarFb}>{user.displayName?.[0]?.toUpperCase()}</div>
        }
        <div style={PT.name}>{user.displayName}</div>
        <div style={PT.email}>{user.email}</div>
      </div>

      {/* Scrollable */}
      <div style={PT.scroll}>
        <div style={{ ...PT.optionsBox, background: T.card, boxShadow: T.shadow }}>

          <ProfileOption icon="✏️" label="Profile Edit karo" sub="Naam, bio, photo update karo" onClick={onEditProfile} T={T} />
          <div style={{ ...PT.divider, background: T.divider }} />

          <ProfileOption icon="🔒" label="Password Change karo" sub="Apna password badlo" onClick={onEditProfile} T={T} />
          <div style={{ ...PT.divider, background: T.divider }} />

          <ProfileOption
            icon="🔔"
            label="Notifications"
            sub={
              notifPermission === "granted" ? "✅ Enabled hain"
              : notifPermission === "denied" ? "❌ Browser settings se enable karo"
              : "Tap karke enable karo"
            }
            onClick={notifPermission === "default" ? onEnableNotif : undefined}
            disabled={notifPermission !== "default"}
            T={T}
          />
          <div style={{ ...PT.divider, background: T.divider }} />

          {/* Dark Mode Toggle */}
          <div style={PT.option} onClick={toggle}>
            <div style={{ ...PT.optionIcon, background: T.iconBg }}>
              {isDark ? "☀️" : "🌙"}
            </div>
            <div style={PT.optionInfo}>
              <div style={{ ...PT.optionLabel, color: T.text }}>
                {isDark ? "Light Mode" : "Dark Mode"}
              </div>
              <div style={PT.optionSub}>
                {isDark ? "Light theme pe switch karo" : "Dark theme pe switch karo"}
              </div>
            </div>
            {/* Toggle switch */}
            <div style={{
              ...PT.toggleTrack,
              background: isDark ? "#0084ff" : "#ddd",
            }}>
              <div style={{
                ...PT.toggleThumb,
                transform: isDark ? "translateX(20px)" : "translateX(2px)",
              }} />
            </div>
          </div>
        </div>

        <button onClick={onLogout} style={PT.logoutBtn}>
          🚪 Logout
        </button>

        <div style={{ ...PT.footer, color: T.sub }}>
          ChatApp v1.0 • Made with ❤️
        </div>
      </div>
    </div>
  );
}

function ProfileOption({ icon, label, sub, onClick, disabled, T }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{ ...PT.option, opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      <div style={{ ...PT.optionIcon, background: T.iconBg }}>{icon}</div>
      <div style={PT.optionInfo}>
        <div style={{ ...PT.optionLabel, color: T.text }}>{label}</div>
        <div style={PT.optionSub}>{sub}</div>
      </div>
      {!disabled && <div style={{ ...PT.arrow, color: T.sub }}>›</div>}
    </div>
  );
}

// ── Theme colors ──
const light = {
  bg: "#f0f2f5",
  card: "#ffffff",
  text: "#1a1a1a",
  sub: "#aaa",
  divider: "#f0f0f0",
  iconBg: "#f0f4ff",
  shadow: "0 2px 10px rgba(0,0,0,.07)",
};

const dark = {
  bg: "#0f0f0f",
  card: "#1e1e1e",
  text: "#f0f0f0",
  sub: "#666",
  divider: "#2a2a2a",
  iconBg: "#2a2a2a",
  shadow: "0 2px 10px rgba(0,0,0,.4)",
};

const PT = {
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  hero: {
    flexShrink: 0,
    background: "linear-gradient(135deg,#0084ff,#0052cc)",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "24px 20px 28px", gap: 6,
  },
  avatar: { width: 86, height: 86, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,.5)", marginBottom: 6 },
  avatarFb: { width: 86, height: 86, borderRadius: "50%", background: "rgba(255,255,255,.25)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, marginBottom: 6, border: "3px solid rgba(255,255,255,.4)" },
  name: { color: "white", fontWeight: 700, fontSize: 19 },
  email: { color: "rgba(255,255,255,.7)", fontSize: 12 },
  scroll: { flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 80 },
  optionsBox: { margin: "16px 12px 0", borderRadius: 16, overflow: "hidden" },
  divider: { height: 1, marginLeft: 66 },
  option: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" },
  optionIcon: { width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 },
  optionInfo: { flex: 1, minWidth: 0 },
  optionLabel: { fontWeight: 600, fontSize: 14 },
  optionSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  arrow: { fontSize: 22, flexShrink: 0 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, flexShrink: 0, position: "relative", transition: "background 0.3s", cursor: "pointer" },
  toggleThumb: { position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "transform 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,.3)" },
  logoutBtn: { display: "block", margin: "14px 12px 0", padding: "14px", background: "#fff1f1", color: "#ff4444", border: "1px solid #ffd5d5", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "calc(100% - 24px)", textAlign: "center" },
  footer: { textAlign: "center", fontSize: 11, padding: "14px 0 8px" },
};

export default ProfileTab;
