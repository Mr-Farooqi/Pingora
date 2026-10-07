import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onDisconnect, onValue } from "firebase/database";
import Auth from "./Auth";
import UserList from "./UserList";
import PrivateChat from "./PrivateChat";
import Profile from "./Profile";
import ProfileTab from "./ProfileTab";
import { useTheme } from "./ThemeContext";
import { requestNotificationPermission, showNotification, playNotificationSound } from "./notifications";

function App() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const { isDark } = useTheme();
  const T = isDark ? dark : light;

  const selectedUserRef = useRef(null);
  const appStartTime = useRef(Date.now());
  const notifiedKeys = useRef(new Set());

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      setTimeout(() => setShowLanding(false), 2200);
    });
    return () => unsub();
  }, []);

  useEffect(() => { if (user) setupPresence(user.uid); }, [user]);

  const setupPresence = (uid) => {
    const statusRef = ref(db, "status/" + uid);
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === false) { set(statusRef, { state: "offline", lastSeen: Date.now() }); return; }
      onDisconnect(statusRef).set({ state: "offline", lastSeen: Date.now() })
        .then(() => set(statusRef, { state: "online", lastSeen: Date.now() }));
    });
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, "chats"), (snap) => {
      const allChats = snap.val();
      if (!allChats) return;
      Object.entries(allChats).forEach(([chatId, messagesObj]) => {
        if (!chatId.includes(user.uid)) return;
        Object.entries(messagesObj).forEach(([msgKey, msgData]) => {
          if (notifiedKeys.current.has(msgKey)) return;
          const msgTime = msgData.timestamp || 0;
          if (msgTime <= appStartTime.current) { notifiedKeys.current.add(msgKey); return; }
          if (msgData.sender === user.uid) { notifiedKeys.current.add(msgKey); return; }
          notifiedKeys.current.add(msgKey);
          const isThisChatOpen = selectedUserRef.current &&
            chatId === [user.uid, selectedUserRef.current.uid].sort().join("_") &&
            document.visibilityState === "visible";
          if (!isThisChatOpen) {
            showNotification(msgData.senderName || "Naya Message", msgData.text || "📷 Photo", null, () => {});
            playNotificationSound();
          }
        });
      });
    });
    return () => unsub();
  }, [user]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    requestNotificationPermission().then(granted => setNotifPermission(granted ? "granted" : "denied"));
  };

  if (loading || showLanding) return <LandingScreen onReady={requestFullscreen} />;
  if (!user) return <Auth onLogin={setUser} />;

  return (
    <div style={{ ...S.app, background: T.bg }}>

      {/* CHAT TAB */}
      <div style={{
        ...S.page,
        transform: activeTab === "chat" ? "translateX(0)" : "translateX(-100%)",
        pointerEvents: activeTab === "chat" ? "auto" : "none",
      }}>
        {/* Contacts */}
        <div style={{
          ...S.subPage,
          background: T.card,
          transform: selectedUser ? "translateX(-100%)" : "translateX(0)",
        }}>
          <div style={S.topBar}>
            <div style={S.topTitle}>
              <span style={{ fontSize: 22 }}>💬</span>
              <span style={S.topTitleText}>ChatApp</span>
            </div>
            {notifPermission !== "granted" && (
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setNotifPermission(granted ? "granted" : "denied");
                }}
                style={S.notifBtn}
              >🔔</button>
            )}
          </div>
          <div style={S.listScroll}>
            <UserList currentUser={user} onSelectUser={setSelectedUser} selectedUser={selectedUser} />
          </div>
        </div>

        {/* Chat */}
        <div style={{
          ...S.subPage,
          background: T.bg,
          transform: selectedUser ? "translateX(0)" : "translateX(100%)",
        }}>
          {selectedUser && (
            <PrivateChat currentUser={user} selectedUser={selectedUser} onBack={() => setSelectedUser(null)} />
          )}
        </div>
      </div>

      {/* PROFILE TAB */}
      <div style={{
        ...S.page,
        transform: activeTab === "profile" ? "translateX(0)" : "translateX(100%)",
        pointerEvents: activeTab === "profile" ? "auto" : "none",
        background: T.bg,
      }}>
        <ProfileTab
          user={user}
          notifPermission={notifPermission}
          onEnableNotif={async () => {
            const granted = await requestNotificationPermission();
            setNotifPermission(granted ? "granted" : "denied");
          }}
          onEditProfile={() => setShowProfile(true)}
          onLogout={() => signOut(auth)}
        />
      </div>

      {/* NAVBAR */}
      {!selectedUser && (
        <div style={{ ...S.navbar, background: T.card, borderTop: `1px solid ${T.border}` }}>
          <button
            style={{ ...S.navBtn, color: activeTab === "chat" ? "#0084ff" : T.sub }}
            onClick={() => setActiveTab("chat")}
          >
            <span style={{ fontSize: 24 }}>💬</span>
            <span style={S.navLabel}>Chats</span>
            {activeTab === "chat" && <div style={S.navIndicator} />}
          </button>

          <button
            style={{ ...S.navBtn, color: activeTab === "profile" ? "#0084ff" : T.sub }}
            onClick={() => setActiveTab("profile")}
          >
            <div style={S.navAvatarWrap}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{
                    ...S.navAvatar,
                    border: activeTab === "profile" ? "2px solid #0084ff" : `2px solid ${T.border}`
                  }} />
                : <div style={{
                    ...S.navAvatarFb,
                    background: T.inputBg,
                    border: activeTab === "profile" ? "2px solid #0084ff" : `2px solid ${T.border}`,
                    color: activeTab === "profile" ? "#0084ff" : T.sub
                  }}>
                    {user.displayName?.[0]?.toUpperCase()}
                  </div>
              }
            </div>
            <span style={S.navLabel}>Profile</span>
            {activeTab === "profile" && <div style={S.navIndicator} />}
          </button>
        </div>
      )}

      {showProfile && (
        <Profile
          currentUser={user}
          onClose={() => { setShowProfile(false); setUser({ ...auth.currentUser }); }}
        />
      )}
    </div>
  );
}

/* ── Landing ── */
function LandingScreen({ onReady }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 900);
    const t3 = setTimeout(() => setStep(3), 1500);
    const handleTap = () => { if (onReady) onReady(); };
    document.addEventListener("click", handleTap, { once: true });
    document.addEventListener("touchstart", handleTap, { once: true });
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <div style={LS.wrap} onClick={onReady}>
      <div style={{ ...LS.logo, opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? "scale(1)" : "scale(0.3)" }}>💬</div>
      <div style={{ ...LS.title, opacity: step >= 2 ? 1 : 0, transform: step >= 2 ? "translateY(0)" : "translateY(20px)" }}>ChatApp</div>
      <div style={{ ...LS.sub, opacity: step >= 3 ? 1 : 0 }}>Private • Secure • Real-time</div>
      <div style={{ ...LS.dots, opacity: step >= 3 ? 1 : 0 }}>
        {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ ...LS.dot, animationDelay: `${d}s` }} />)}
      </div>
      {step >= 3 && <div style={LS.tapHint}>Tap to continue</div>}
    </div>
  );
}

const LS = {
  wrap: { position: "fixed", inset: 0, background: "linear-gradient(135deg,#0084ff,#0052cc)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer" },
  logo: { fontSize: 80, transition: "all 0.6s cubic-bezier(.34,1.56,.64,1)" },
  title: { fontSize: 34, fontWeight: 800, color: "white", letterSpacing: 1, transition: "all 0.5s" },
  sub: { fontSize: 13, color: "rgba(255,255,255,.75)", letterSpacing: 2, transition: "opacity 0.5s" },
  dots: { display: "flex", gap: 8, marginTop: 32, transition: "opacity 0.5s" },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,.7)", display: "inline-block", animation: "bounce 0.7s infinite alternate" },
  tapHint: { position: "absolute", bottom: 48, color: "rgba(255,255,255,.6)", fontSize: 13, letterSpacing: 1 },
};

const light = { bg: "#f0f2f5", card: "#fff", border: "#eee", sub: "#aaa", inputBg: "#f0f2f5" };
const dark  = { bg: "#0f0f0f", card: "#1a1a1a", border: "#2a2a2a", sub: "#555", inputBg: "#222" };

const S = {
  app: { position: "fixed", inset: 0, overflow: "hidden", fontFamily: "'Segoe UI', sans-serif" },
  page: { position: "absolute", top: 0, left: 0, right: 0, bottom: 64, transition: "transform 0.3s cubic-bezier(.4,0,.2,1)", overflow: "hidden" },
  subPage: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", transition: "transform 0.3s cubic-bezier(.4,0,.2,1)", overflow: "hidden" },
  topBar: { flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 20px", minHeight: 62, background: "linear-gradient(135deg,#0084ff 0%,#0052cc 100%)" },
  topTitle: { display: "flex", alignItems: "center", gap: 10 },
  topTitleText: { color: "white", fontWeight: 800, fontSize: 20, letterSpacing: 0.5 },
  notifBtn: { background: "rgba(255,255,255,.18)", border: "none", borderRadius: 10, width: 38, height: 38, fontSize: 17, cursor: "pointer" },
  listScroll: { flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" },
  navbar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 64, display: "flex", alignItems: "stretch", boxShadow: "0 -2px 12px rgba(0,0,0,.1)", zIndex: 100 },
  navBtn: { flex: 1, border: "none", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", position: "relative", transition: "color 0.2s" },
  navLabel: { fontSize: 11, fontWeight: 600, letterSpacing: 0.2 },
  navIndicator: { position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 3, background: "#0084ff", borderRadius: "3px 3px 0 0" },
  navAvatarWrap: { position: "relative" },
  navAvatar: { width: 28, height: 28, borderRadius: "50%", objectFit: "cover" },
  navAvatarFb: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
};

export default App;
