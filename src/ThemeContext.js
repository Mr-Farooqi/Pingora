import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("chatapp-theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("chatapp-theme", isDark ? "dark" : "light");
    document.body.style.background = isDark ? "#0f0f0f" : "#f0f2f5";
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
