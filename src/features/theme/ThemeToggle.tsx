import { useState } from "react";

type Theme = "light" | "dark";

const themeStorageKey = "buddy-theme";

function getInitialTheme(): Theme {
  try {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    const theme = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (themeColor) {
      themeColor.content = theme === "dark" ? "#151b18" : "#f5f6f2";
    }
    return theme;
  } catch {
    document.documentElement.dataset.theme = "light";
    return "light";
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [storageWarning, setStorageWarning] = useState(false);
  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  function toggleTheme(): void {
    const updatedTheme = nextTheme;
    document.documentElement.dataset.theme = updatedTheme;
    setTheme(updatedTheme);

    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (themeColor) {
      themeColor.content = updatedTheme === "dark" ? "#151b18" : "#f5f6f2";
    }

    try {
      window.localStorage.setItem(themeStorageKey, updatedTheme);
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }

  return (
    <div className="theme-toggle">
      <button
        aria-label={`เปลี่ยนเป็นโหมด${nextTheme === "dark" ? "มืด" : "สว่าง"}`}
        aria-pressed={theme === "dark"}
        className="button button-secondary"
        onClick={toggleTheme}
        type="button"
      >
        {nextTheme === "dark" ? "🌙 เปิดโหมดมืด" : "☀️ เปิดโหมดสว่าง"}
      </button>
      {storageWarning && (
        <span className="theme-warning" role="status">
          เปลี่ยนโหมดแล้ว แต่เบราว์เซอร์ไม่สามารถจำการตั้งค่านี้ได้
        </span>
      )}
    </div>
  );
}
