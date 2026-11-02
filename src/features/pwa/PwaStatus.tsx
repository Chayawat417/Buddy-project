import { useRegisterSW } from "virtual:pwa-register/react";
import { useState } from "react";
import { useLanguage } from "../../i18n";

export default function PwaStatus() {
  const { t } = useLanguage();
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
          <p>{t("pwa.updateNotice")}</p>
          <button
            className="button button-primary"
            onClick={() => void updateServiceWorker(true)}
            type="button"
          >
            {t("pwa.update")}
          </button>
        </>
      ) : (
        <p>{t("pwa.offlineReady")}</p>
      )}
      <button
        aria-label={t("pwa.dismissLabel")}
        className="button button-secondary"
        onClick={() => setIsDismissed(true)}
        type="button"
      >
        {t("pwa.dismiss")}
      </button>
    </aside>
  );
}
