import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { BudgetCategoryRecord } from "../../data/buddyDatabase";
import {
  BudgetCategoryAlreadyExistsError,
  BudgetCategoryNameError,
  createBudgetCategory,
  listBudgetCategories,
  renameBudgetCategory,
  setBudgetCategoryActive,
} from "./categoryRepository";

interface CategorySettingsProps {
  onBack: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof BudgetCategoryNameError) {
    return error.code === "required"
      ? "กรุณากรอกชื่อหมวด"
      : "ชื่อหมวดต้องไม่เกิน 60 ตัวอักษร";
  }
  if (error instanceof BudgetCategoryAlreadyExistsError) {
    return error.conflictsWithExistingAllocation
      ? "เปลี่ยนย้อนหลังไม่ได้ เพราะมีชื่อหมวดนี้อยู่ในเดือนเดียวกันแล้ว"
      : "มีหมวดชื่อนี้อยู่แล้ว";
  }
  return "บันทึกหมวดไม่สำเร็จ กรุณาลองอีกครั้ง";
}

export default function CategorySettings({ onBack }: CategorySettingsProps) {
  const [categories, setCategories] = useState<BudgetCategoryRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameHistorical, setRenameHistorical] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function refreshCategories(): Promise<void> {
    setCategories(await listBudgetCategories(true));
  }

  useEffect(() => {
    let isMounted = true;
    void listBudgetCategories(true)
      .then((result) => {
        if (isMounted) setCategories(result);
      })
      .catch(() => {
        if (isMounted) setErrorMessage("เปิดรายการหมวดไม่สำเร็จ กรุณารีเฟรชหน้า");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await createBudgetCategory(newName);
      await refreshCategories();
      setNewName("");
      setSuccessMessage("เพิ่มหมวดในรายการแล้ว");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function beginRename(category: BudgetCategoryRecord): void {
    setEditingId(category.id);
    setEditingName(category.name);
    setRenameHistorical(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleRename(
    event: FormEvent<HTMLFormElement>,
    category: BudgetCategoryRecord,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (
      renameHistorical &&
      !window.confirm(
        `เปลี่ยนชื่อหมวด "${category.name}" ย้อนหลังในทุกเดือนและทุกโปรไฟล์หรือไม่?`,
      )
    ) {
      return;
    }

    try {
      await renameBudgetCategory(category.id, editingName, renameHistorical);
      await refreshCategories();
      setEditingId(null);
      setSuccessMessage(
        renameHistorical
          ? "เปลี่ยนชื่อหมวดในรายการและข้อมูลย้อนหลังแล้ว"
          : "เปลี่ยนชื่อหมวดสำหรับการเลือกใหม่แล้ว ข้อมูลเดิมยังใช้ชื่อเดิม",
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleVisibilityChange(
    category: BudgetCategoryRecord,
  ): Promise<void> {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await setBudgetCategoryActive(category.id, !category.isActive);
      await refreshCategories();
      setSuccessMessage(
        category.isActive
          ? "ซ่อนหมวดจากตัวเลือกใหม่แล้ว ข้อมูลเดิมยังอยู่"
          : "นำหมวดกลับมาแสดงในตัวเลือกแล้ว",
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <section className="settings-card" aria-labelledby="category-settings-title">
      <div className="settings-heading">
        <div>
          <p className="eyebrow">รายการใช้ร่วมกันทุกโปรไฟล์</p>
          <h1 id="category-settings-title">ตั้งค่าหมวดงบประมาณ</h1>
          <p className="settings-description">
            เพิ่มและจัดการชื่อหมวดที่จะแสดงให้เลือกในตารางรายเดือน
          </p>
        </div>
        <button className="button button-secondary" onClick={onBack} type="button">
          กลับไปหน้างบประมาณ
        </button>
      </div>

      <form className="category-create-form" onSubmit={(event) => void handleAdd(event)}>
        <div>
          <label htmlFor="new-budget-category">ชื่อหมวดใหม่</label>
          <input
            id="new-budget-category"
            maxLength={60}
            onChange={(event) => setNewName(event.target.value)}
            required
            value={newName}
          />
        </div>
        <button className="button button-primary" type="submit">
          เพิ่มหมวด
        </button>
      </form>

      <p className="settings-hint">
        การซ่อนหมวดจะเอาออกจากรายการเลือกใหม่ แต่ไม่ลบยอดที่บันทึกไว้
        คุณสามารถนำหมวดที่ซ่อนกลับมาใช้ได้
      </p>

      {errorMessage && (
        <p className="error-message" role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="success-message" role="status">
          {successMessage}
        </p>
      )}

      {isLoading ? (
        <p role="status">กำลังโหลดรายการหมวด…</p>
      ) : categories.length === 0 ? (
        <p className="empty-row">ยังไม่มีหมวด เพิ่มหมวดแรกได้ด้านบน</p>
      ) : (
        <ul className="category-settings-list">
          {categories.map((category) => (
            <li
              className={category.isActive ? "" : "is-hidden-category"}
              key={category.id}
            >
              {editingId === category.id ? (
                <form
                  className="category-edit-form"
                  onSubmit={(event) => void handleRename(event, category)}
                >
                  <div>
                    <label htmlFor={`edit-category-${category.id}`}>
                      ชื่อหมวด
                    </label>
                    <input
                      autoFocus
                      id={`edit-category-${category.id}`}
                      maxLength={60}
                      onChange={(event) => setEditingName(event.target.value)}
                      required
                      value={editingName}
                    />
                  </div>
                  <label className="category-history-option">
                    <input
                      checked={renameHistorical}
                      onChange={(event) =>
                        setRenameHistorical(event.target.checked)
                      }
                      type="checkbox"
                    />
                    เปลี่ยนชื่อในข้อมูลย้อนหลังทุกโปรไฟล์ด้วย
                  </label>
                  <div className="category-settings-actions">
                    <button className="button button-primary" type="submit">
                      บันทึกชื่อ
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => setEditingId(null)}
                      type="button"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="category-settings-name">
                    <strong>{category.name}</strong>
                    {!category.isActive && <span>ซ่อนจากรายการเลือก</span>}
                  </div>
                  <div className="category-settings-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => beginRename(category)}
                      type="button"
                    >
                      เปลี่ยนชื่อ
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => void handleVisibilityChange(category)}
                      type="button"
                    >
                      {category.isActive ? "ซ่อนหมวด" : "แสดงหมวด"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
