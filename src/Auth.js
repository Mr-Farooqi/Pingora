import React, { useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { ref, set } from "firebase/database";

function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    try {
      if (isRegister) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await set(ref(db, "users/" + result.user.uid), {
          name: name,
          email: email,
          uid: result.user.uid
        });
        onLogin(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        onLogin(result.user);
      }
    } catch (err) {
      if (err.code === "auth/user-not-found") setError("Ye email registered nahi hai!");
      else if (err.code === "auth/wrong-password") setError("Password galat hai!");
      else if (err.code === "auth/email-already-in-use") setError("Ye email pehle se registered hai!");
      else if (err.code === "auth/weak-password") setError("Password kam az kam 6 characters ka hona chahiye!");
      else setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    if (!resetEmail) {
      setError("Email daalo pehle!");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") setError("Ye email registered nahi hai!");
      else setError(err.message);
    }
    setResetLoading(false);
  };

  // Forgot Password Screen
  if (showForgotPassword) {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <h2 style={styles.title}>💬 Chat App</h2>
          <h3 style={styles.subtitle}>🔑 Password Reset</h3>

          {resetSent ? (
            <div style={styles.successBox}>
              <p style={{ margin: 0, fontSize: 24, textAlign: "center" }}>📧</p>
              <p style={{ margin: "8px 0 0", fontWeight: "bold", textAlign: "center" }}>
                Email bhej diya!
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#555", textAlign: "center" }}>
                <strong>{resetEmail}</strong> pe reset link bhej diya gaya hai. Email check karo aur link pe click karo.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#777", margin: 0, textAlign: "center" }}>
                Apni registered email daalo — hum password reset link bhejenge.
              </p>
              <input
                placeholder="Apni email address"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                style={styles.input}
                type="email"
              />
              {error && <p style={styles.error}>{error}</p>}
              <button
                onClick={handleForgotPassword}
                style={styles.button}
                disabled={resetLoading}
              >
                {resetLoading ? "Bhej rahe hain... ⏳" : "Reset Link Bhejo 📧"}
              </button>
            </>
          )}

          <p style={{ textAlign: "center", margin: 0 }}>
            <span
              style={styles.link}
              onClick={() => {
                setShowForgotPassword(false);
                setResetSent(false);
                setResetEmail("");
                setError("");
              }}
            >
              ← Wapas Login pe jao
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Main Login / Register Screen
  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h2 style={styles.title}>💬 Chat App</h2>
        <h3 style={styles.subtitle}>{isRegister ? "Register karo" : "Login karo"}</h3>

        {isRegister && (
          <input
            placeholder="Apna naam"
            value={name}
            onChange={e => setName(e.target.value)}
            style={styles.input}
          />
        )}
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
          type="email"
        />
        <input
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={styles.input}
          type="password"
        />

        {error && <p style={styles.error}>{error}</p>}

        <button onClick={handleSubmit} style={styles.button}>
          {isRegister ? "Register" : "Login"}
        </button>

        {/* Forgot Password Link - sirf login pe dikhao */}
        {!isRegister && (
          <p
            style={{ textAlign: "center", fontSize: 13, margin: 0, cursor: "pointer", color: "#0084ff" }}
            onClick={() => { setShowForgotPassword(true); setError(""); setResetEmail(email); }}
          >
            🔑 Password bhool gaye?
          </p>
        )}

        <p style={styles.toggle}>
          {isRegister ? "Pehle se account hai?" : "Account nahi hai?"}{" "}
          <span style={styles.link} onClick={() => { setIsRegister(!isRegister); setError(""); }}>
            {isRegister ? "Login karo" : "Register karo"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" },
  box: { background: "white", padding: 32, borderRadius: 16, width: 320, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: 12 },
  title: { textAlign: "center", margin: 0, color: "#0084ff" },
  subtitle: { textAlign: "center", margin: 0, color: "#555", fontWeight: "normal" },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" },
  button: { padding: "12px", background: "#0084ff", color: "white", border: "none", borderRadius: 8, fontSize: 15, cursor: "pointer", fontWeight: "bold" },
  toggle: { textAlign: "center", fontSize: 13, color: "#555", margin: 0 },
  link: { color: "#0084ff", cursor: "pointer", fontWeight: "bold" },
  error: { color: "red", fontSize: 12, textAlign: "center", margin: 0 },
  successBox: { background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: 10, padding: 16 }
};

export default Auth;