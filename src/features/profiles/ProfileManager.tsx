import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ProfileRecord } from "../../data/buddyDatabase";
import BuddyLogo from "../brand/BuddyLogo";
import AllocationPlanner from "../allocations/AllocationPlanner";
import CategorySettings from "../allocations/CategorySettings";
import BackupControls from "../backup/BackupControls";
import InstallAppButton from "../pwa/InstallAppButton";
import ReportViewer from "../reports/ReportViewer";
import CreditCardExpenses from "../expenses/CreditCardExpenses";
import ThemeToggle from "../theme/ThemeToggle";
import LanguageToggle from "../language/LanguageToggle";
import { useLanguage } from "../../i18n";
import type { TranslationKey } from "../../i18n";
import {
  createProfile,
  deleteProfile,
  getActiveProfileId,
  listProfiles,
  ProfileAlreadyExistsError,
  ProfileNameError,
  ProfileNotFoundError,
  renameProfile,
  setActiveProfileId,
} from "./profileRepository";

function getErrorMessage(
  error: unknown,
): TranslationKey {
  if (error instanceof ProfileNameError) {
    return error.code === "required"
      ? "profile.error.required"
      : "profile.error.tooLong";
  }

  if (error instanceof ProfileAlreadyExistsError) {
    return "profile.error.duplicate";
  }

  if (error instanceof ProfileNotFoundError) {
    return "profile.error.notFound";
  }

  return "profile.error.save";
}

export default function ProfileManager() {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [activePage, setActivePage] = useState<
    "budget" | "categories" | "expenses"
  >("budget");
  const [dataVersion, setDataVersion] = useState(0);
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<TranslationKey | null>(null);

  async function refreshProfiles(): Promise<void> {
    const savedProfiles = await listProfiles();
    const savedActiveProfileId = await getActiveProfileId();
    const activeExists = savedProfiles.some(
      (profile) => profile.id === savedActiveProfileId,
    );
    const nextActiveProfileId = activeExists
      ? savedActiveProfileId
      : (savedProfiles[0]?.id ?? null);

    if (nextActiveProfileId !== savedActiveProfileId) {
      await setActiveProfileId(nextActiveProfileId);
    }

    setProfiles(savedProfiles);
    setActiveProfileIdState(nextActiveProfileId);
    setDataVersion((current) => current + 1);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles(): Promise<void> {
      try {
        await refreshProfiles();
      } catch {
        if (isMounted) {
          setErrorMessage("profile.loadError");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfiles();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? null;
  const isProfileCardCompact = Boolean(activeProfile) || activePage !== "budget";

  function beginCreate(): void {
    setName("");
    setErrorMessage(null);
    setIsCreating(true);
    setIsRenaming(false);
  }

  function beginRename(): void {
    if (!activeProfile) return;
    setName(activeProfile.name);
    setErrorMessage(null);
    setIsRenaming(true);
    setIsCreating(false);
  }

  function cancelEditing(): void {
    setIsCreating(false);
    setIsRenaming(false);
    setName("");
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    try {
      if (isRenaming && activeProfile) {
        const updatedProfile = await renameProfile(activeProfile.id, name);
        setProfiles((current) =>
          current.map((profile) =>
            profile.id === updatedProfile.id ? updatedProfile : profile,
          ),
        );
      } else {
        const newProfile = await createProfile(name);
        await setActiveProfileId(newProfile.id);
        setProfiles((current) => [...current, newProfile]);
        setActiveProfileIdState(newProfile.id);
      }

      cancelEditing();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleProfileChange(profileId: string): Promise<void> {
    setErrorMessage(null);
    try {
      await setActiveProfileId(profileId);
      setActiveProfileIdState(profileId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDelete(): Promise<void> {
    if (!activeProfile) return;

    const confirmed = window.confirm(
      t("profile.deleteConfirm", { name: activeProfile.name }),
    );
    if (!confirmed) return;

    setErrorMessage(null);
    try {
      await deleteProfile(activeProfile.id);
      const remainingProfiles = profiles.filter(
        (profile) => profile.id !== activeProfile.id,
      );
      const nextActiveProfileId = remainingProfiles[0]?.id ?? null;
      await setActiveProfileId(nextActiveProfileId);
      setProfiles(remainingProfiles);
      setActiveProfileIdState(nextActiveProfileId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  if (isLoading) {
    return (
      <main className="welcome">
        <p role="status">{t("profile.loadStatus")}</p>
      </main>
    );
  }

  return (
    <main className="welcome">
      <header className="dashboard-chrome">
        <div className="dashboard-topbar">
          <div className="dashboard-brand">
            <BuddyLogo />
          </div>
          <div className="page-tools">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <nav aria-label={t("navigation.label")} className="page-navigation">
          <button
            aria-current={activePage === "budget" ? "page" : undefined}
            className={
              activePage === "budget"
                ? "button button-primary"
                : "button button-secondary"
            }
            onClick={() => setActivePage("budget")}
            type="button"
          >
            {t("navigation.budget")}
          </button>
          <button
            aria-current={activePage === "expenses" ? "page" : undefined}
            className={
              activePage === "expenses"
                ? "button button-primary"
                : "button button-secondary"
            }
            onClick={() => setActivePage("expenses")}
            type="button"
          >
            {t("navigation.expenses")}
          </button>
          <button
            aria-current={activePage === "categories" ? "page" : undefined}
            className={
              activePage === "categories"
                ? "button button-primary"
                : "button button-secondary"
            }
            onClick={() => setActivePage("categories")}
            type="button"
          >
            {t("navigation.categories")}
          </button>
        </nav>
      </header>
      <div className="dashboard-content">
        <div className="cockpit-workspace-header">
          <div className="cockpit-breadcrumb">
            <span>Buddy</span>
            <span aria-hidden="true">/</span>
            <strong aria-current="page">
              {t(
                activePage === "budget"
                  ? "navigation.budget"
                  : activePage === "expenses"
                    ? "navigation.expenses"
                    : "navigation.categories",
              )}
            </strong>
          </div>
          <div className="cockpit-local-state">
            <span aria-hidden="true" className="status-dot" />
            <span>{t("profile.localData")}</span>
          </div>
        </div>
        <section
          aria-labelledby={isProfileCardCompact ? undefined : "welcome-title"}
          className={
            isProfileCardCompact
              ? `profile-card profile-card-compact${activeProfile ? "" : " profile-card-empty"}`
              : "welcome-card profile-card"
          }
        >
          {!isProfileCardCompact && (
            <>
              <div className="brand-lockup">
                <BuddyLogo />
              </div>
              <p className="eyebrow">{t("profile.eyebrow")}</p>
              <h1 id="welcome-title">{t("profile.title")}</h1>
              <p className="welcome-copy">{t("profile.description")}</p>
            </>
          )}

          {profiles.length > 0 && (
            <div className="profile-picker">
              <label htmlFor="profile-select">{t("profile.label")}</label>
              <select
                id="profile-select"
                value={activeProfileId ?? ""}
                onChange={(event) => void handleProfileChange(event.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <div className="profile-actions">
                <button className="button button-secondary" onClick={beginRename}>
                  {t("profile.rename")}
                </button>
                <button className="button button-danger" onClick={handleDelete}>
                  {t("profile.delete")}
                </button>
              </div>
            </div>
          )}

          {(isCreating || isRenaming) && (
            <form
              className="profile-form"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <label htmlFor="profile-name">
                {t(isRenaming ? "profile.newName" : "profile.name")}
              </label>
              <input
                autoFocus
                id="profile-name"
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
              <div className="profile-actions">
                <button className="button button-primary" type="submit">
                  {t("profile.save")}
                </button>
                <button
                  className="button button-secondary"
                  onClick={cancelEditing}
                  type="button"
                >
                  {t("profile.cancel")}
                </button>
              </div>
            </form>
          )}

          {!isCreating && !isRenaming && (
            <button
              className="button button-primary add-profile"
              onClick={beginCreate}
            >
              {t("profile.add")}
            </button>
          )}

          {errorMessage && (
            <p className="error-message" role="alert">
              {t(errorMessage)}
            </p>
          )}

          {!isProfileCardCompact && (
            <div className="setup-note" role="status">
              <span className="status-dot" aria-hidden="true" />
              <span>{t("profile.localData")}</span>
            </div>
          )}
          <InstallAppButton />
          {isProfileCardCompact ? (
            <details className="profile-backup-details">
              <summary>{t("backup.title")}</summary>
              <BackupControls onRestored={refreshProfiles} />
            </details>
          ) : (
            <BackupControls onRestored={refreshProfiles} />
          )}
        </section>
        {activePage === "expenses" ? (
          <CreditCardExpenses key={`expenses-${dataVersion}`} />
        ) : activePage === "categories" ? (
          <CategorySettings onBack={() => setActivePage("budget")} />
        ) : activeProfile ? (
          <>
            <AllocationPlanner
              key={`${activeProfile.id}-${dataVersion}`}
              profileId={activeProfile.id}
              profileName={activeProfile.name}
            />
            <ReportViewer
              key={`report-${activeProfile.id}`}
              profileId={activeProfile.id}
              profileName={activeProfile.name}
            />
          </>
        ) : null}
        <footer className="welcome-footer">{t("profile.footer")}</footer>
      </div>
    </main>
  );
}
