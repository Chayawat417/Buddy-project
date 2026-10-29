import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ProfileRecord } from "../../data/buddyDatabase";
import AllocationPlanner from "../allocations/AllocationPlanner";
import CategorySettings from "../allocations/CategorySettings";
import BackupControls from "../backup/BackupControls";
import InstallAppButton from "../pwa/InstallAppButton";
import ReportViewer from "../reports/ReportViewer";
import ThemeToggle from "../theme/ThemeToggle";
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

function getErrorMessage(error: unknown): string {
  if (error instanceof ProfileNameError) {
    return error.code === "required"
      ? "กรุณากรอกชื่อโปรไฟล์"
      : "ชื่อโปรไฟล์ต้องไม่เกิน 40 ตัวอักษร";
  }

  if (error instanceof ProfileAlreadyExistsError) {
    return "มีโปรไฟล์ชื่อนี้แล้ว";
  }

  if (error instanceof ProfileNotFoundError) {
    return "ไม่พบโปรไฟล์นี้ กรุณาโหลดรายการใหม่";
  }

  return "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองอีกครั้ง";
}

export default function ProfileManager() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [activePage, setActivePage] = useState<"budget" | "categories">("budget");
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles(): Promise<void> {
      try {
        await refreshProfiles();
      } catch {
        if (isMounted) {
          setErrorMessage("เปิดฐานข้อมูลโปรไฟล์ไม่สำเร็จ กรุณารีเฟรชหน้า");
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

  function beginCreate(): void {
    setName("");
    setErrorMessage("");
    setIsCreating(true);
    setIsRenaming(false);
  }

  function beginRename(): void {
    if (!activeProfile) return;
    setName(activeProfile.name);
    setErrorMessage("");
    setIsRenaming(true);
    setIsCreating(false);
  }

  function cancelEditing(): void {
    setIsCreating(false);
    setIsRenaming(false);
    setName("");
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");

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
    setErrorMessage("");
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
      `ลบโปรไฟล์ "${activeProfile.name}" และงบประมาณทั้งหมดของโปรไฟล์นี้หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`,
    );
    if (!confirmed) return;

    setErrorMessage("");
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
        <p role="status">กำลังเปิดโปรไฟล์…</p>
      </main>
    );
  }

  return (
    <main className="welcome">
      <div className="page-tools">
        <ThemeToggle />
      </div>
      <section className="welcome-card profile-card" aria-labelledby="welcome-title">
        <div className="brand-mark" aria-hidden="true">
          b
        </div>
        <p className="eyebrow">พื้นที่วางแผนการเงินของคุณ</p>
        <h1 id="welcome-title">จัดสรรเงินอย่างสบายใจ</h1>
        <p className="welcome-copy">
          Buddy จะช่วยแบ่งรายได้เป็นงบประมาณที่ชัดเจน
          และตรวจสอบยอดคงเหลือให้คุณในทุกเดือน
        </p>

        {profiles.length > 0 && (
          <div className="profile-picker">
            <label htmlFor="profile-select">โปรไฟล์</label>
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
                เปลี่ยนชื่อ
              </button>
              <button className="button button-danger" onClick={handleDelete}>
                ลบโปรไฟล์
              </button>
            </div>
          </div>
        )}

        {(isCreating || isRenaming) && (
          <form className="profile-form" onSubmit={(event) => void handleSubmit(event)}>
            <label htmlFor="profile-name">
              {isRenaming ? "ชื่อโปรไฟล์ใหม่" : "ชื่อโปรไฟล์"}
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
                บันทึก
              </button>
              <button
                className="button button-secondary"
                onClick={cancelEditing}
                type="button"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        {!isCreating && !isRenaming && (
          <button className="button button-primary add-profile" onClick={beginCreate}>
            เพิ่มโปรไฟล์
          </button>
        )}

        {errorMessage && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="setup-note" role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>โปรไฟล์และข้อมูลเก็บไว้ในอุปกรณ์นี้</span>
        </div>
        <InstallAppButton />
        <BackupControls onRestored={refreshProfiles} />
      </section>
      <nav aria-label="หน้าหลักของ Buddy" className="page-navigation">
        <button
          aria-current={activePage === "budget" ? "page" : undefined}
          className={
            activePage === "budget" ? "button button-primary" : "button button-secondary"
          }
          onClick={() => setActivePage("budget")}
          type="button"
        >
          งบประมาณ
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
          ตั้งค่าหมวด
        </button>
      </nav>
      {activePage === "categories" ? (
        <CategorySettings onBack={() => setActivePage("budget")} />
      ) : activeProfile ? (
        <>
          <AllocationPlanner
            key={activeProfile.id}
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
      <footer className="welcome-footer">
        ใช้ร่วมกันได้ แต่อย่าลืมว่าผู้ใช้เครื่องนี้อาจเห็นทุกโปรไฟล์
      </footer>
    </main>
  );
}
