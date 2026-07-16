import React from "react";

function ProfileTab({ user, onEditProfile, onLogout, notifPermission, onEnableNotif }) {
  return (
    <div style={PT.container}>

      {/* Hero Section */}
      <div style={PT.hero}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={PT.avatar} />
          : <div style={PT.avatarFb}>{user.displayName?.[0]?.toUpperCase()}</div>
        }
        <div style={PT.name}>{user.displayName}</div>
        <div style={PT.email}>{user.email}</div>
      </div>

      {/* Scrollable Options */}
      <div style={PT.scroll}>

        <div style={PT.optionsBox}>
          <ProfileOption
            icon="✏️"
            label="Profile Edit karo"
            sub="Naam, bio, photo update karo"
            onClick={onEditProfile}
          />
          <div style={PT.divider} />
          <ProfileOption
            icon="🔒"
            label="Password Change karo"
            sub="Apna password badlo"
            onClick={onEditProfile}
          />
          <div style={PT.divider} />
          <ProfileOption
            icon="🔔"
            label="Notifications"
            sub={
              notifPermission === "granted"
                ? "✅ Enabled hain"
                : notifPermission === "denied"
                ? "❌ Browser settings se enable karo"
                : "Tap karke enable karo"
            }
            onClick={notifPermission === "default" ? onEnableNotif : undefined}
            disabled={notifPermission !== "default"}
          />
          <div style={PT.divider} />
          <ProfileOption
            icon="🌙"
            label="Dark Mode"
            sub="Coming soon..."
            disabled
          />
        </div>

        <button onClick={onLogout} style={PT.logoutBtn}>
          🚪 Logout
        </button>

        <div style={PT.footer}>Pingora v1.0 • Made By Mr_Faruqui ❤️</div>
      </div>
    </div>
  );
}

function ProfileOption({ icon, label, sub, onClick, disabled }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        ...PT.option,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <div style={PT.optionIcon}>{icon}</div>
      <div style={PT.optionInfo}>
        <div style={PT.optionLabel}>{label}</div>
        <div style={PT.optionSub}>{sub}</div>
      </div>
      {!disabled && <div style={PT.arrow}>›</div>}
    </div>
  );
}

const PT = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    background: "#f0f2f5",
  },

  hero: {
    flexShrink: 0,
    background: "linear-gradient(135deg,#0084ff,#0052cc)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 20px 28px",
    gap: 6,
  },
  avatar: {
    width: 86, height: 86, borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(255,255,255,.5)",
    marginBottom: 6,
  },
  avatarFb: {
    width: 86, height: 86, borderRadius: "50%",
    background: "rgba(255,255,255,.25)", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 36, fontWeight: 700, marginBottom: 6,
    border: "3px solid rgba(255,255,255,.4)",
  },
  name: { color: "white", fontWeight: 700, fontSize: 19 },
  email: { color: "rgba(255,255,255,.7)", fontSize: 12 },

  scroll: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 80,
  },

  optionsBox: {
    background: "white",
    margin: "16px 12px 0",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
  },
  divider: {
    height: 1,
    background: "#f0f0f0",
    marginLeft: 66,
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "white",
    transition: "background 0.15s",
  },
  optionIcon: {
    width: 38, height: 38,
    background: "#f0f4ff",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 19, flexShrink: 0,
  },
  optionInfo: { flex: 1, minWidth: 0 },
  optionLabel: {
    fontWeight: 600, fontSize: 14, color: "#1a1a1a",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  optionSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  arrow: { color: "#ccc", fontSize: 22, flexShrink: 0 },

  logoutBtn: {
    display: "block",
    margin: "14px 12px 0",
    padding: "14px",
    background: "#fff1f1",
    color: "#ff4444",
    border: "1px solid #ffd5d5",
    borderRadius: 14,
    fontSize: 15, fontWeight: 700,
    cursor: "pointer",
    width: "calc(100% - 24px)",
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    color: "#ccc",
    fontSize: 11,
    padding: "14px 0 8px",
  },
};

export default ProfileTab;