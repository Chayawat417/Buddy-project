import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { BudgetCategoryRecord } from "../../data/buddyDatabase";
import { useLanguage } from "../../i18n";
import type { TranslationKey } from "../../i18n";
import {
  BudgetCategoryAlreadyExistsError,
  BudgetCategoryNameError,
  createBudgetCategory,
  listBudgetCategories,
  renameBudgetCategory,
  setBudgetCategoryActive,
} from "./categoryRepository";
import {
  getBudgetCategoryOrder,
  saveBudgetCategoryOrder,
  sortBudgetCategoriesByOrder,
} from "./categoryOrderRepository";

interface CategorySettingsProps {
  onBack: () => void;
}

function getErrorMessageKey(error: unknown): TranslationKey {
  if (error instanceof BudgetCategoryNameError) {
    return error.code === "required"
      ? "category.error.required"
      : "category.error.tooLong";
  }
  if (error instanceof BudgetCategoryAlreadyExistsError) {
    return error.conflictsWithExistingAllocation
      ? "category.error.conflictHistorical"
      : "category.error.duplicate";
  }
  return "category.error.save";
}

export default function CategorySettings({ onBack }: CategorySettingsProps) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<BudgetCategoryRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameHistorical, setRenameHistorical] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrderSaving, setIsOrderSaving] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<TranslationKey | null>(null);
  const [successMessage, setSuccessMessage] = useState<TranslationKey | null>(null);

  async function refreshCategories(): Promise<void> {
    const [allCategories, order] = await Promise.all([
      listBudgetCategories(true),
      getBudgetCategoryOrder(),
    ]);
    setCategories(sortBudgetCategoriesByOrder(allCategories, order));
  }

  useEffect(() => {
    let isMounted = true;
    void Promise.all([listBudgetCategories(true), getBudgetCategoryOrder()])
      .then(([result, order]) => {
        if (!isMounted) return;
        setCategories(sortBudgetCategoriesByOrder(result, order));
      })
      .catch(() => {
        if (isMounted) setErrorMessage("category.loadingError");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function reorderCategory(fromId: string, toIndex: number): Promise<void> {
    const fromIndex = categories.findIndex((category) => category.id === fromId);
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= categories.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const nextCategories = [...categories];
    const [movedCategory] = nextCategories.splice(fromIndex, 1);
    nextCategories.splice(toIndex, 0, movedCategory);
    setIsOrderSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await saveBudgetCategoryOrder(
        nextCategories.map((category) => category.id),
      );
      setCategories(nextCategories);
      setSuccessMessage("category.orderSaved");
    } catch {
      setErrorMessage("category.orderSaveError");
    } finally {
      setIsOrderSaving(false);
      setDraggedCategoryId(null);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createBudgetCategory(newName);
      await refreshCategories();
      setNewName("");
      setSuccessMessage("category.added");
    } catch (error) {
      setErrorMessage(getErrorMessageKey(error));
    }
  }

  function beginRename(category: BudgetCategoryRecord): void {
    setEditingId(category.id);
    setEditingName(category.name);
    setRenameHistorical(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleRename(
    event: FormEvent<HTMLFormElement>,
    category: BudgetCategoryRecord,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (
      renameHistorical &&
      !window.confirm(
        t("category.renameConfirm", { name: category.name }),
      )
    ) {
      return;
    }

    try {
      await renameBudgetCategory(category.id, editingName, renameHistorical);
      await refreshCategories();
      setEditingId(null);
      setSuccessMessage(renameHistorical ? "category.renamedAll" : "category.renamedNew");
    } catch (error) {
      setErrorMessage(getErrorMessageKey(error));
    }
  }

  async function handleVisibilityChange(
    category: BudgetCategoryRecord,
  ): Promise<void> {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await setBudgetCategoryActive(category.id, !category.isActive);
      await refreshCategories();
      setSuccessMessage(category.isActive ? "category.hidden" : "category.shown");
    } catch (error) {
      setErrorMessage(getErrorMessageKey(error));
    }
  }

  return (
    <section className="settings-card" aria-labelledby="category-settings-title">
      <div className="settings-heading">
        <div>
          <p className="eyebrow">{t("category.settingsEyebrow")}</p>
          <h1 id="category-settings-title">{t("category.settingsTitle")}</h1>
          <p className="settings-description">{t("category.settingsDescription")}</p>
        </div>
        <button className="button button-secondary" onClick={onBack} type="button">
          {t("category.back")}
        </button>
      </div>

      <form className="category-create-form" onSubmit={(event) => void handleAdd(event)}>
        <div>
          <label htmlFor="new-budget-category">{t("category.new")}</label>
          <input
            id="new-budget-category"
            maxLength={60}
            onChange={(event) => setNewName(event.target.value)}
            required
            value={newName}
          />
        </div>
        <button className="button button-primary" type="submit">
          {t("category.add")}
        </button>
      </form>

      <p className="settings-hint">
        {t("category.hideHint")}
      </p>

      {errorMessage && (
        <p className="error-message" role="alert">
          {t(errorMessage)}
        </p>
      )}
      {successMessage && (
        <p className="success-message" role="status">
          {t(successMessage)}
        </p>
      )}

      {isLoading ? (
        <p role="status">{t("category.loading")}</p>
      ) : categories.length === 0 ? (
        <p className="empty-row">{t("category.empty")}</p>
      ) : (
        <>
          <h2 className="category-order-title">{t("category.orderTitle")}</h2>
          <p className="settings-description">{t("category.orderHint")}</p>
          <ul className="category-settings-list">
            {categories.map((category) => (
              <li
                className={category.isActive ? "" : "is-hidden-category"}
                key={category.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const categoryId =
                    event.dataTransfer.getData("text/plain") || draggedCategoryId;
                  if (!categoryId) return;
                  const targetIndex = categories.findIndex(
                    (item) => item.id === category.id,
                  );
                  void reorderCategory(categoryId, targetIndex);
                }}
              >
                {editingId === category.id ? (
                  <form
                    className="category-edit-form"
                    onSubmit={(event) => void handleRename(event, category)}
                  >
                    <div>
                      <label htmlFor={`edit-category-${category.id}`}>
                        {t("category.name")}
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
                      {t("category.renameHistorical")}
                    </label>
                    <div className="category-settings-actions">
                      <button className="button button-primary" type="submit">
                        {t("category.saveName")}
                      </button>
                      <button
                        className="button button-secondary"
                        onClick={() => setEditingId(null)}
                        type="button"
                      >
                        {t("profile.cancel")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="category-settings-name">
                      <button
                        aria-label={t("category.dragCategory", {
                          name: category.name,
                        })}
                        className="button button-secondary category-order-handle"
                        draggable={!isOrderSaving}
                        onDragEnd={() => setDraggedCategoryId(null)}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", category.id);
                          setDraggedCategoryId(category.id);
                        }}
                        type="button"
                      >
                        <span aria-hidden="true">☰</span>
                      </button>
                      <strong>{category.name}</strong>
                      {!category.isActive && (
                        <span>{t("category.hiddenStatus")}</span>
                      )}
                    </div>
                    <div className="category-settings-actions">
                      <button
                        aria-label={t("category.moveUp", {
                          name: category.name,
                        })}
                        className="button button-secondary"
                        disabled={
                          isOrderSaving || categories[0]?.id === category.id
                        }
                        onClick={() =>
                          void reorderCategory(
                            category.id,
                            categories.findIndex(
                              (item) => item.id === category.id,
                            ) - 1,
                          )
                        }
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={t("category.moveDown", {
                          name: category.name,
                        })}
                        className="button button-secondary"
                        disabled={
                          isOrderSaving ||
                          categories[categories.length - 1]?.id === category.id
                        }
                        onClick={() =>
                          void reorderCategory(
                            category.id,
                            categories.findIndex(
                              (item) => item.id === category.id,
                            ) + 1,
                          )
                        }
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={isOrderSaving}
                        onClick={() => beginRename(category)}
                        type="button"
                      >
                        {t("profile.rename")}
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={isOrderSaving}
                        onClick={() => void handleVisibilityChange(category)}
                        type="button"
                      >
                        {category.isActive
                          ? t("category.hide")
                          : t("category.show")}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
