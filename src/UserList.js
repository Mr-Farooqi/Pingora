import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";
import { useTheme } from "./ThemeContext";

function UserList({ currentUser, onSelectUser, selectedUser }) {
  const [allUsers, setAllUsers] = useState([]);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const { isDark } = useTheme();
  const T = isDark ? dark : light;

  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snap) => {
      const data = snap.val();
      if (data) setAllUsers(Object.values(data).filter(u => u.uid !== currentUser.uid));
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    const unsub = onValue(ref(db, "status"), (snap) => {
      setOnlineStatus(snap.val() || {});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "chats"), (snap) => {
      const data = snap.val();
      if (!data) return;
      const myChats = Object.keys(data).filter(chatId => chatId.includes(currentUser.uid));
      const recentUids = myChats.map(chatId => {
        const uids = chatId.split("_");
        return uids.find(uid => uid !== currentUser.uid);
      }).filter(Boolean);
      const recentUsers = recentUids.map(uid => allUsers.find(u => u.uid === uid)).filter(Boolean);
      setRecentChats(recentUsers);
    });
    return () => unsub();
  }, [currentUser, allUsers]);

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    const results = allUsers.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q)
    );
    setSearchResults(results);
    setSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearched(false);
  };

  const isOnline = (uid) => onlineStatus[uid]?.state === "online";

  return (
    <div style={{ ...S.container, background: T.bg }}>
      {/* Search */}
      <div style={{ ...S.searchWrap, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ ...S.searchBox, background: T.inputBg }}>
          <span style={S.searchIcon}>🔍</span>
          <input
            style={{ ...S.searchInput, color: T.text, background: "transparent" }}
            placeholder="Naam, email ya phone se dhundo..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) clearSearch(); }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          {searchQuery && <button onClick={clearSearch} style={S.clearBtn}>✕</button>}
        </div>
        <button onClick={handleSearch} style={S.searchBtn}>Dhundo</button>
      </div>

      {/* Search Results */}
      {searched && (
        <div>
          <div style={{ ...S.sectionLabel, color: T.sub }}>
            🔎 Search Results {searchResults.length > 0 ? `(${searchResults.length})` : ""}
          </div>
          {searching && <div style={{ ...S.hint, color: T.sub }}>Searching...</div>}
          {!searching && searchResults.length === 0 && (
            <div style={S.emptyBox}>
              <div style={{ fontSize: 40 }}>😕</div>
              <div style={{ ...S.emptyTitle, color: T.text }}>Koi user nahi mila</div>
              <div style={{ ...S.emptySubt, color: T.sub }}>Naam, email, phone ya user ID se try karo</div>
            </div>
          )}
          {searchResults.map(user => (
            <UserItem key={user.uid} user={user} isOnline={isOnline(user.uid)} isSelected={selectedUser?.uid === user.uid} onClick={() => { onSelectUser(user); clearSearch(); }} T={T} />
          ))}
        </div>
      )}

      {/* Recent Chats */}
      {!searched && (
        <div>
          {recentChats.length > 0 ? (
            <>
              <div style={{ ...S.sectionLabel, color: T.sub }}>💬 Recent Chats</div>
              {recentChats.map(user => (
                <UserItem key={user.uid} user={user} isOnline={isOnline(user.uid)} isSelected={selectedUser?.uid === user.uid} onClick={() => onSelectUser(user)} T={T} />
              ))}
            </>
          ) : (
            <div style={S.emptyBox}>
              <div style={{ fontSize: 48 }}>🔒</div>
              <div style={{ ...S.emptyTitle, color: T.text }}>Privacy First!</div>
              <div style={{ ...S.emptySubt, color: T.sub }}>Kisi user ko dhundne ke liye upar search karo</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserItem({ user, isOnline, isSelected, onClick, T }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...S.item,
        background: isSelected ? (T === dark ? "#1a2a3a" : "#e8f0fe") : "transparent",
        borderLeft: isSelected ? "3px solid #0084ff" : "3px solid transparent",
      }}
    >
      <div style={S.avatarWrap}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={S.avatar} />
          : <div style={{ ...S.avatarFb, background: strColor(user.name) }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
        }
        <span style={{ ...S.dot, background: isOnline ? "#44d62c" : "#555" }} />
      </div>
      <div style={S.info}>
        <div style={{ ...S.name, color: T.text }}>{user.name}</div>
        <div style={{ ...S.status, color: isOnline ? "#44d62c" : T.sub }}>
          {isOnline ? "🟢 Online" : "⚫ Offline"}
        </div>
      </div>
      <div style={{ color: T.sub, fontSize: 22 }}>›</div>
    </div>
  );
}

function strColor(str = "") {
  const list = ["#0084ff","#e91e63","#9c27b0","#ff5722","#009688","#ff9800","#3f51b5"];
  let h = 0;
  for (let c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return list[Math.abs(h) % list.length];
}

const light = { bg: "#fff", inputBg: "#f5f7fb", text: "#1a1a1a", sub: "#aaa", border: "#f0f0f0" };
const dark  = { bg: "#111", inputBg: "#1e1e1e", text: "#f0f0f0", sub: "#555", border: "#2a2a2a" };

const S = {
  container: { display: "flex", flexDirection: "column", height: "100%" },
  searchWrap: { display: "flex", gap: 8, padding: "10px 12px", flexShrink: 0, alignItems: "center" },
  searchBox: { flex: 1, display: "flex", alignItems: "center", gap: 8, borderRadius: 12, padding: "9px 12px" },
  searchIcon: { fontSize: 14, opacity: 0.5, flexShrink: 0 },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 14, minWidth: 0 },
  clearBtn: { background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 14, padding: "0 2px", flexShrink: 0 },
  searchBtn: { background: "#0084ff", color: "white", border: "none", borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: "12px 16px 6px", textTransform: "uppercase" },
  hint: { fontSize: 13, padding: "8px 16px" },
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: 10, textAlign: "center" },
  emptyTitle: { fontWeight: 700, fontSize: 16 },
  emptySubt: { fontSize: 13, lineHeight: 1.5 },
  item: { display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", transition: "background 0.15s", borderLeft: "3px solid transparent" },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: { width: 48, height: 48, borderRadius: "50%", objectFit: "cover" },
  avatarFb: { width: 48, height: 48, borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 },
  dot: { position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", border: "2px solid white" },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  status: { fontSize: 12, marginTop: 2 },
};

export default UserList;
