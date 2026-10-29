import { useRegisterSW } from "virtual:pwa-register/react";
import { useState } from "react";

export default function PwaStatus() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || (!needRefresh && !offlineReady)) return null;

  return (
    <aside aria-live="polite" className="pwa-notice">
      {needRefresh ? (
        <>
          <p>มี Buddy เวอร์ชันใหม่พร้อมใช้งาน บันทึกข้อมูลที่กำลังแก้ก่อนอัปเดต</p>
          <button
            className="button button-primary"
            onClick={() => void updateServiceWorker(true)}
            type="button"
          >
            อัปเดตแอป
          </button>
        </>
      ) : (
        <p>Buddy พร้อมใช้งานออฟไลน์แล้ว</p>
      )}
      <button
        aria-label="ปิดข้อความสถานะแอป"
        className="button button-secondary"
        onClick={() => setIsDismissed(true)}
        type="button"
      >
        ปิด
      </button>
    </aside>
  );
}
