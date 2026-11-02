import { useEffect, useState } from "react";
import type { BudgetCategoryRecord } from "../../data/buddyDatabase";
import AllocationRow from "./AllocationRow";
import MonthlyComparison from "./MonthlyComparison";
import { formatBudgetMonth, formatSatangAsCurrency, getDefaultBudgetMonth } from "../../domain/money";
import { listBudgetCategories } from "./categoryRepository";
import {
  getBudgetCategoryOrder,
  sortBudgetCategoriesByOrder,
  sortAllocationsByCategoryOrder,
} from "./categoryOrderRepository";
import { useAllocationPlanner } from "./useAllocationPlanner";
import { useLanguage } from "../../i18n";

interface AllocationPlannerProps {
  profileId: string;
  profileName: string;
}

export default function AllocationPlanner({
  profileId,
  profileName,
}: AllocationPlannerProps) {
  const { locale, t } = useLanguage();
  const [month, setMonth] = useState(getDefaultBudgetMonth);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [categories, setCategories] = useState<BudgetCategoryRecord[]>([]);
  const [allCategories, setAllCategories] = useState<BudgetCategoryRecord[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [hasCategoryError, setHasCategoryError] = useState(false);
  const planner = useAllocationPlanner(profileId, month);

  useEffect(() => {
    let isMounted = true;
    void Promise.all([
      listBudgetCategories(true),
      getBudgetCategoryOrder(),
    ])
      .then(([allCategories, order]) => {
        if (isMounted) {
          setAllCategories(allCategories);
          setCategories(
            sortBudgetCategoriesByOrder(
              allCategories.filter((category) => category.isActive),
              order,
            ),
          );
          setCategoryOrder(order);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasCategoryError(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);
  const orderedAllocations = sortAllocationsByCategoryOrder(
    planner.allocations,
    allCategories,
    categoryOrder,
  );

  return (
    <section className="budget-card" aria-labelledby="budget-title">
      <div className="budget-heading">
        <div>
          <p className="eyebrow">{t("budget.eyebrow", { name: profileName })}</p>
          <h2 id="budget-title">{t("budget.title")}</h2>
          <p className="budget-hint">{t("budget.hint")}</p>
        </div>
        <div className="month-field">
          <label htmlFor="budget-month">{t("budget.month")}</label>
          <input
            disabled={planner.isCopyingPreviousMonth}
            id="budget-month"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
          <button
            className="button button-secondary"
            disabled={planner.isLoading || planner.isCopyingPreviousMonth}
            onClick={() => void planner.handleCopyPreviousMonth()}
            type="button"
          >
            {planner.isCopyingPreviousMonth
              ? t("budget.copying")
              : t("budget.copyPrevious")}
          </button>
          <p className="field-hint">
            {t("budget.copyHint")}
          </p>
        </div>
      </div>

      <form
        className="income-form"
        onSubmit={(event) => void planner.handleIncomeSubmit(event)}
      >
        <div>
          <label htmlFor="monthly-income">{t("budget.income")}</label>
          <p className="field-hint">{t("budget.incomeHint")}</p>
        </div>
        <input
          id="monthly-income"
          inputMode="decimal"
          min="0"
          onChange={(event) => planner.setIncome(event.target.value)}
          placeholder={t("budget.incomePlaceholder")}
          required
          step="0.01"
          type="number"
          value={planner.income}
        />
        <button className="button button-primary" type="submit">
          {t("budget.saveIncome")}
        </button>
      </form>

      <div className="reconciliation" role="status" aria-live="polite">
        <div>
          <span>{t("budget.incomeSummary")}</span>
          <strong>
            {planner.incomeSatang === null
              ? "—"
              : formatSatangAsCurrency(planner.incomeSatang, locale)}
          </strong>
        </div>
        <div>
          <span>{t("budget.allocated")}</span>
          <strong>{formatSatangAsCurrency(planner.allocatedSatang, locale)}</strong>
        </div>
        <div
          className={
            planner.totals && planner.totals.remainingSatang < 0
              ? "reconciliation-status is-over"
              : planner.totals && planner.totals.remainingSatang === 0
                ? "reconciliation-status is-balanced"
                : "reconciliation-status"
          }
        >
          <span>
            {!planner.totals
              ? t("budget.enterIncome")
              : planner.totals.remainingSatang < 0
                ? t("budget.overIncome")
                : planner.totals.remainingSatang === 0
                  ? t("budget.fullyAllocated")
                  : t("budget.remaining")}
          </span>
          <strong>
            {planner.totals
              ? formatSatangAsCurrency(Math.abs(planner.totals.remainingSatang), locale)
              : "—"}
          </strong>
        </div>
      </div>

      <div className="comparison-section">
        <button
          aria-controls="monthly-comparison"
          aria-expanded={isComparisonOpen}
          className="button button-secondary"
          onClick={() => setIsComparisonOpen((current) => !current)}
          type="button"
        >
          {isComparisonOpen
            ? t("budget.hideComparison")
            : t("budget.showComparison")}
        </button>
        <section
          aria-labelledby="monthly-comparison-title"
          className="comparison-panel"
          hidden={!isComparisonOpen}
          id="monthly-comparison"
        >
          <h3 id="monthly-comparison-title">{t("budget.comparisonTitle")}</h3>
          {isComparisonOpen && (
            <MonthlyComparison
              key={`${profileId}-${month}`}
              month={month}
              profileId={profileId}
            />
          )}
        </section>
      </div>

      <div className="allocation-list">
        <h3>{t("budget.categoriesForMonth", { month: formatBudgetMonth(month, locale) })}</h3>
        {planner.isLoading ? (
          <p role="status">{t("budget.loading")}</p>
        ) : (
          <div
            aria-label={t("budget.tableLabel")}
            className="table-scroll"
            role="region"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">{t("budget.category")}</th>
                  <th scope="col">{t("budget.amount")}</th>
                  <th scope="col">{t("budget.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orderedAllocations.map((allocation, index) => (
                  <AllocationRow
                    allocation={allocation}
                    categories={categories}
                    index={index}
                    key={allocation.id}
                    onAmountChange={planner.handleAllocationAmountChange}
                    onDelete={planner.handleDeleteAllocation}
                    onSave={planner.handleSaveAllocation}
                  />
                ))}
                {planner.allocations.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan={3}>
                      {t("budget.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {hasCategoryError && (
          <p className="error-message" role="alert">
            {t("budget.categoryLoadError")}
          </p>
        )}
        <form
          className="add-allocation-form"
          onSubmit={(event) => void planner.handleAddAllocation(event)}
        >
          <div>
            <label htmlFor="new-allocation-name">{t("budget.chooseCategory")}</label>
            <select
              id="new-allocation-name"
              onChange={(event) => planner.setNewName(event.target.value)}
              required
              value={planner.newName}
            >
              <option disabled value="">
                {categories.length > 0 ? t("budget.choose") : t("budget.goToCategories")}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-allocation-amount">{t("budget.amount")}</label>
            <input
              id="new-allocation-amount"
              inputMode="decimal"
              onChange={(event) => planner.setNewAmount(event.target.value)}
              placeholder={t("budget.amountPlaceholder")}
              type="text"
              value={planner.newAmount}
            />
          </div>
          <button
            className="button button-primary"
            disabled={categories.length === 0}
            type="submit"
          >
            {t("budget.add")}
          </button>
        </form>
      </div>

      {planner.errorMessage && (
        <p className="error-message" role="alert">
          {planner.errorMessage}
        </p>
      )}
      {planner.successMessage && (
        <p className="success-message" role="status">
          {planner.successMessage}
        </p>
      )}
    </section>
  );
}
