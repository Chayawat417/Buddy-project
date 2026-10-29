import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  createBackup,
  InvalidBackupError,
  restoreBackup,
  serializeBackup,
} from "./backupRepository";

const maximumBackupFileSize = 10 * 1024 * 1024;

interface BackupControlsProps {
  onRestored: () => Promise<void>;
}

export default function BackupControls({ onRestored }: BackupControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  async function handleExport(): Promise<void> {
    setMessage("");
    setErrorMessage("");
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
      setMessage("สร้างไฟล์สำรองแล้ว เก็บไฟล์นี้ไว้ในที่ปลอดภัย");
    } catch {
      setErrorMessage("สร้างไฟล์สำรองไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage("");
    setErrorMessage("");

    if (file.size > maximumBackupFileSize) {
      setErrorMessage("ไฟล์สำรองมีขนาดใหญ่เกิน 10 MB");
      return;
    }

    const confirmed = window.confirm(
      "นำเข้าข้อมูลจากไฟล์นี้และแทนที่โปรไฟล์กับงบประมาณทั้งหมดในอุปกรณ์นี้หรือไม่? ควรส่งออกไฟล์สำรองปัจจุบันก่อนดำเนินการ",
    );
    if (!confirmed) return;

    setIsWorking(true);
    let restored = false;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      await restoreBackup(parsed);
      restored = true;
      await onRestored();
      setMessage("กู้คืนข้อมูลแล้ว");
    } catch (error) {
      if (restored) {
        setErrorMessage("กู้คืนข้อมูลแล้ว แต่โหลดหน้าจอใหม่ไม่สำเร็จ กรุณารีเฟรชหน้า");
      } else if (error instanceof InvalidBackupError) {
        setErrorMessage("ไฟล์ไม่ใช่ข้อมูลสำรอง Buddy ที่รองรับ หรือข้อมูลภายในไม่ถูกต้อง");
      } else {
        setErrorMessage("อ่านหรือกู้คืนไฟล์ไม่สำเร็จ ข้อมูลในเครื่องยังไม่ได้ถูกแทนที่");
      }
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="backup-controls" aria-labelledby="backup-title">
      <h2 id="backup-title">สำรองและกู้คืน</h2>
      <p>
        ไฟล์สำรองมีข้อมูลทุกโปรไฟล์และงบประมาณ เก็บไฟล์ไว้ในที่ปลอดภัย
        เพราะทุกคนที่เข้าถึงไฟล์ได้สามารถอ่านข้อมูลได้
      </p>
      <div className="backup-actions">
        <button
          className="button button-secondary"
          disabled={isWorking}
          onClick={() => void handleExport()}
          type="button"
        >
          ส่งออกไฟล์สำรอง
        </button>
        <button
          className="button button-secondary"
          disabled={isWorking}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          นำเข้าไฟล์สำรอง
        </button>
        <input
          accept="application/json,.json"
          aria-label="เลือกไฟล์สำรอง Buddy JSON"
          className="visually-hidden"
          onChange={(event) => void handleImport(event)}
          ref={fileInputRef}
          type="file"
        />
      </div>
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      {errorMessage && (
        <p className="error-message" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
