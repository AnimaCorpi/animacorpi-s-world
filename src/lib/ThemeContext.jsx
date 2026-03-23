import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

// "auto" means follow system, "light"/"dark" means user override
function getInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialMode() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return "manual";
  return "auto";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [mode, setMode] = useState(getInitialMode); // "auto" | "manual"

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Listen to system preference changes — always apply when in auto mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (mode === "auto") {
        setThemeState(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    setMode("manual");
    localStorage.setItem("theme", next);
  };

  // Reset to following system automatically
  const resetToAuto = () => {
    localStorage.removeItem("theme");
    setMode("auto");
    setThemeState(
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, resetToAuto, isAuto: mode === "auto" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);