import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event): void {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function handleAppInstalled(): void {
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall(): Promise<void> {
    if (!installPrompt) return;

    setErrorMessage("");
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      setErrorMessage("เปิดหน้าต่างติดตั้งไม่สำเร็จ กรุณาใช้เมนูติดตั้งของ Chrome");
      setInstallPrompt(null);
    }
  }

  if (!installPrompt) return null;

  return (
    <div className="install-app">
      <button
        className="button button-secondary"
        onClick={() => void handleInstall()}
        type="button"
      >
        ติดตั้ง Buddy
      </button>
      {errorMessage && (
        <p className="error-message" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
