import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  createBackup,
  InvalidBackupError,
  restoreBackup,
  serializeBackup,
} from "./backupRepository";
import { useLanguage } from "../../i18n";
import type { TranslationKey } from "../../i18n";

const maximumBackupFileSize = 10 * 1024 * 1024;

interface BackupControlsProps {
  onRestored: () => Promise<void>;
}

export default function BackupControls({ onRestored }: BackupControlsProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<TranslationKey | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function handleExport(): Promise<void> {
    setMessage(null);
    setErrorMessage(null);
    setIsWorking(true);

    try {
      const backup = await createBackup();
      const file = new Blob([serializeBackup(backup)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `buddy-backup-${date}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("backup.exported");
    } catch {
      setErrorMessage("backup.exportError");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage(null);
    setErrorMessage(null);

    if (file.size > maximumBackupFileSize) {
      setErrorMessage("backup.tooLarge");
      return;
    }

    const confirmed = window.confirm(
      t("backup.confirm"),
    );
    if (!confirmed) return;

    setIsWorking(true);
    let restored = false;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      await restoreBackup(parsed);
      restored = true;
      await onRestored();
      setMessage("backup.restored");
    } catch (error) {
      if (restored) {
        setErrorMessage("backup.refreshError");
      } else if (error instanceof InvalidBackupError) {
        setErrorMessage("backup.invalid");
      } else {
        setErrorMessage("backup.importError");
      }
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="backup-controls" aria-labelledby="backup-title">
      <h2 id="backup-title">{t("backup.title")}</h2>
      <p>{t("backup.description")}</p>
      <div className="backup-actions">
        <button
          className="button button-secondary"
          disabled={isWorking}
          onClick={() => void handleExport()}
          type="button"
        >
          {isWorking ? t("backup.working") : t("backup.export")}
        </button>
        <button
          className="button button-secondary"
          disabled={isWorking}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {isWorking ? t("backup.working") : t("backup.import")}
        </button>
        <input
          accept="application/json,.json"
          aria-label={t("backup.fileLabel")}
          className="visually-hidden"
          onChange={(event) => void handleImport(event)}
          ref={fileInputRef}
          type="file"
        />
      </div>
      {message && (
        <p className="success-message" role="status">
          {message && t(message)}
        </p>
      )}
      {errorMessage && (
        <p className="error-message" role="alert">
          {errorMessage && t(errorMessage)}
        </p>
      )}
    </section>
  );
}
