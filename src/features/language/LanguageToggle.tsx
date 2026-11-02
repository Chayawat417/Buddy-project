import { useLanguage } from "../../i18n";

export default function LanguageToggle() {
  const { locale, setLocale, storageWarning, t } = useLanguage();
  const nextLocale = locale === "th" ? "en" : "th";

  return (
    <div className="theme-toggle">
      <button
        aria-label={t("language.label", {
          language: t(nextLocale === "en" ? "language.nameEnglish" : "language.nameThai"),
        })}
        className="button button-secondary"
        onClick={() => setLocale(nextLocale)}
        type="button"
      >
        {nextLocale === "en" ? "English" : "ภาษาไทย"}
      </button>
      {storageWarning && (
        <span className="theme-warning" role="status">
          {t("language.storageWarning")}
        </span>
      )}
    </div>
  );
}
