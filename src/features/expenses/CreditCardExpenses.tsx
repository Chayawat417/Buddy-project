import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLanguage } from "../../i18n";
import type { TranslationKey } from "../../i18n";
import {
  formatBudgetMonth,
  formatSatangAsBahtInput,
  formatSatangAsCurrency,
  parseBahtToSatang,
  MoneyInputError,
} from "../../domain/money";
import {
  calculateMonthlyExpenseTotals,
  createCreditCardExpense,
  createExpenseMerchant,
  CreditCardExpenseInputError,
  CreditCardExpenseNotFoundError,
  ExpenseMerchantAlreadyExistsError,
  ExpenseMerchantNameError,
  ExpenseMerchantNotFoundError,
  deleteCreditCardExpense,
  getOutstandingExpenseTotals,
  listCreditCardExpensesForMonth,
  listExpenseMerchants,
  setCreditCardExpenseSettled,
  updateCreditCardExpense,
} from "./expenseRepository";
import type {
  CreditCardExpenseRecord,
  ExpenseMerchantRecord,
} from "../../data/buddyDatabase";

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function getCurrentMonth(): string {
  return getToday().slice(0, 7);
}

function getDateLabel(date: string, locale: "th" | "en"): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getErrorMessageKey(error: unknown): TranslationKey {
  if (error instanceof MoneyInputError) return "expense.error.amount";
  if (error instanceof ExpenseMerchantNameError) {
    return error.code === "required"
      ? "expense.error.merchantRequired"
      : "expense.error.merchantTooLong";
  }
  if (error instanceof ExpenseMerchantAlreadyExistsError) {
    return "expense.error.merchantDuplicate";
  }
  if (error instanceof CreditCardExpenseInputError) {
    if (error.code === "date") return "expense.error.date";
    if (error.code === "amount") return "expense.error.amount";
    return "expense.error.people";
  }
  if (error instanceof CreditCardExpenseNotFoundError) {
    return "expense.error.notFound";
  }
  if (error instanceof ExpenseMerchantNotFoundError) {
    return "expense.error.merchantMissing";
  }
  return "expense.error.save";
}

export default function CreditCardExpenses() {
  const { locale, t } = useLanguage();
  const [month, setMonth] = useState(getCurrentMonth);
  const [purchaseDate, setPurchaseDate] = useState(getToday);
  const [merchants, setMerchants] = useState<ExpenseMerchantRecord[]>([]);
  const [expenses, setExpenses] = useState<CreditCardExpenseRecord[]>([]);
  const [outstandingTotals, setOutstandingTotals] = useState({
    outstandingPersonalSatang: 0,
    outstandingCollectionSatang: 0,
  });
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [peopleCount, setPeopleCount] = useState("2");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingOutstanding, setIsLoadingOutstanding] = useState(true);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isSavingMerchant, setIsSavingMerchant] = useState(false);
  const [isDeletingExpenseId, setIsDeletingExpenseId] = useState<string | null>(
    null,
  );
  const [isUpdatingSettlementId, setIsUpdatingSettlementId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<TranslationKey | null>(null);
  const [successMessage, setSuccessMessage] = useState<TranslationKey | null>(null);

  useEffect(() => {
    let isMounted = true;
    void listExpenseMerchants()
      .then((result) => {
        if (isMounted) {
          setMerchants(result);
        }
      })
      .catch(() => {
        if (isMounted) setErrorMessage("expense.error.load");
      })
      .finally(() => {
        if (isMounted) setIsLoadingMerchants(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingExpenses(true);
    void listCreditCardExpensesForMonth(month)
      .then((result) => {
        if (isMounted) {
          setExpenses(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setExpenses([]);
          setErrorMessage("expense.error.load");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingExpenses(false);
      });
    return () => {
      isMounted = false;
    };
  }, [month]);

  useEffect(() => {
    let isMounted = true;
    void getOutstandingExpenseTotals()
      .then((result) => {
        if (isMounted) setOutstandingTotals(result);
      })
      .catch(() => {
        if (isMounted) setErrorMessage("expense.error.load");
      })
      .finally(() => {
        if (isMounted) setIsLoadingOutstanding(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAddMerchant(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingMerchant(true);
    try {
      const merchant = await createExpenseMerchant(merchantName);
      setMerchants(await listExpenseMerchants());
      setSelectedMerchantId(merchant.id);
      setMerchantName("");
      setSuccessMessage("expense.merchantAdded");
    } catch (error) {
      setErrorMessage(getErrorMessageKey(error));
    } finally {
      setIsSavingMerchant(false);
    }
  }

  async function handleAddExpense(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingExpense(true);
    try {
      const input = {
        purchaseDate,
        merchantId: selectedMerchantId,
        amountSatang: parseBahtToSatang(amount),
        isShared,
        peopleCount: isShared ? Number(peopleCount) : 1,
      };
      if (editingExpenseId) {
        await updateCreditCardExpense(editingExpenseId, input);
      } else {
        await createCreditCardExpense(input);
      }
      const purchaseMonth = purchaseDate.slice(0, 7);
      if (purchaseMonth !== month) {
        setMonth(purchaseMonth);
      } else {
        setExpenses(await listCreditCardExpensesForMonth(purchaseMonth));
      }
      setOutstandingTotals(await getOutstandingExpenseTotals());
      setEditingExpenseId(null);
      setAmount("");
      setIsShared(false);
      setPeopleCount("2");
      setSuccessMessage(editingExpenseId ? "expense.updated" : "expense.saved");
    } catch (error) {
      setErrorMessage(getErrorMessageKey(error));
    } finally {
      setIsSavingExpense(false);
    }
  }

  function beginEdit(expense: CreditCardExpenseRecord): void {
    setEditingExpenseId(expense.id);
    setPurchaseDate(expense.purchaseDate);
    setSelectedMerchantId(expense.merchantId);
    setAmount(formatSatangAsBahtInput(expense.amountSatang));
    setIsShared(expense.isShared);
    setPeopleCount(String(expense.peopleCount));
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function cancelEdit(): void {
    setEditingExpenseId(null);
    setPurchaseDate(getToday());
    setSelectedMerchantId("");
    setAmount("");
    setIsShared(false);
    setPeopleCount("2");
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleDeleteExpense(
    expense: CreditCardExpenseRecord,
  ): Promise<void> {
    if (
      !window.confirm(
        t("expense.deleteConfirm", { merchant: expense.merchantName }),
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDeletingExpenseId(expense.id);
    try {
      await deleteCreditCardExpense(expense.id);
      if (editingExpenseId === expense.id) cancelEdit();
      setExpenses(await listCreditCardExpensesForMonth(month));
      setOutstandingTotals(await getOutstandingExpenseTotals());
      setSuccessMessage("expense.deleted");
    } catch (error) {
      setErrorMessage(
        error instanceof CreditCardExpenseNotFoundError
          ? "expense.error.notFound"
          : "expense.error.save",
      );
    } finally {
      setIsDeletingExpenseId(null);
    }
  }

  async function handleSettlementChange(
    expense: CreditCardExpenseRecord,
    isSettled: boolean,
  ): Promise<void> {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUpdatingSettlementId(expense.id);
    try {
      const updatedExpense = await setCreditCardExpenseSettled(
        expense.id,
        isSettled,
      );
      setExpenses((current) =>
        current.map((item) =>
          item.id === updatedExpense.id ? updatedExpense : item,
        ),
      );
      setOutstandingTotals(await getOutstandingExpenseTotals());
    } catch (error) {
      setErrorMessage(
        error instanceof CreditCardExpenseNotFoundError
          ? "expense.error.notFound"
          : "expense.error.save",
      );
    } finally {
      setIsUpdatingSettlementId(null);
    }
  }

  const totals = calculateMonthlyExpenseTotals(expenses);

  return (
    <section
      aria-labelledby="expense-title"
      className="settings-card expense-page"
    >
      <header className="expense-header">
        <div>
          <h1 id="expense-title">{t("expense.title")}</h1>
          <p className="settings-description">{t("expense.description")}</p>
        </div>
        <p className="expense-shared-note">{t("expense.sharedAcrossProfiles")}</p>
      </header>

      <details className="expense-merchant-management">
        <summary>{t("expense.manageMerchants")}</summary>
        <p className="settings-description">{t("expense.merchantHint")}</p>
        <form
          className="expense-merchant-form"
          onSubmit={(event) => void handleAddMerchant(event)}
        >
          <div>
            <label htmlFor="new-expense-merchant">{t("expense.newMerchant")}</label>
            <input
              autoComplete="organization"
              id="new-expense-merchant"
              maxLength={80}
              onChange={(event) => setMerchantName(event.target.value)}
              required
              value={merchantName}
            />
          </div>
          <button
            className="button button-secondary"
            disabled={isSavingMerchant}
            type="submit"
          >
            {isSavingMerchant ? t("expense.saving") : t("expense.addMerchant")}
          </button>
        </form>
        {isLoadingMerchants ? (
          <p role="status">{t("expense.loadingMerchants")}</p>
        ) : merchants.length === 0 ? (
          <p className="empty-row">{t("expense.noMerchants")}</p>
        ) : (
          <ul aria-label={t("expense.merchantList")} className="expense-merchant-list">
            {merchants.map((merchant) => (
              <li key={merchant.id}>{merchant.name}</li>
            ))}
          </ul>
        )}
      </details>

      <form
        className="expense-entry-form"
        onSubmit={(event) => void handleAddExpense(event)}
      >
        <div>
          <label htmlFor="expense-date">{t("expense.purchaseDate")}</label>
          <input
            id="expense-date"
            onChange={(event) => setPurchaseDate(event.target.value)}
            required
            type="date"
            value={purchaseDate}
          />
        </div>
        <div>
          <label htmlFor="expense-merchant">{t("expense.merchant")}</label>
          <select
            disabled={isLoadingMerchants || merchants.length === 0}
            id="expense-merchant"
            onChange={(event) => setSelectedMerchantId(event.target.value)}
            required
            value={selectedMerchantId}
          >
            <option disabled value="">
              {t(
                merchants.length > 0
                  ? "expense.chooseMerchant"
                  : "expense.addMerchantFirst",
              )}
            </option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="expense-amount">{t("expense.cardAmount")}</label>
          <input
            autoComplete="off"
            id="expense-amount"
            inputMode="decimal"
            min="0.01"
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t("budget.amountPlaceholder")}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </div>
        <fieldset className="expense-share-field">
          <legend className="visually-hidden">{t("expense.share")}</legend>
          <label className="expense-share-option" htmlFor="expense-shared">
            <input
              checked={isShared}
              id="expense-shared"
              onChange={(event) => setIsShared(event.target.checked)}
              type="checkbox"
            />
            {t("expense.share")}
          </label>
          {isShared && (
            <div>
              <label htmlFor="expense-people-count">
                {t("expense.peopleCount")}
              </label>
              <input
                id="expense-people-count"
                min="2"
                onChange={(event) => setPeopleCount(event.target.value)}
                required
                step="1"
                type="number"
                value={peopleCount}
              />
              <p className="field-hint">{t("expense.peopleCountHint")}</p>
            </div>
          )}
        </fieldset>
        <button
          className="button button-primary expense-submit"
          disabled={
            isSavingExpense || isLoadingMerchants || merchants.length === 0
          }
          type="submit"
        >
          {isSavingExpense
            ? t("expense.saving")
            : t(editingExpenseId ? "expense.updateExpense" : "expense.addExpense")}
        </button>
        {editingExpenseId && (
          <button
            className="button button-secondary expense-cancel-edit"
            disabled={isSavingExpense}
            onClick={cancelEdit}
            type="button"
          >
            {t("profile.cancel")}
          </button>
        )}
      </form>

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

      <section
        aria-labelledby="expense-outstanding-title"
        className="expense-outstanding"
      >
        <div>
          <h2 id="expense-outstanding-title">
            {t("expense.outstandingAllMonths")}
          </h2>
          <p className="settings-description">
            {t("expense.outstandingAllMonthsHint")}
          </p>
        </div>
        {isLoadingOutstanding ? (
          <p role="status">{t("expense.loadingExpenses")}</p>
        ) : (
          <dl
            aria-label={t("expense.outstandingAllMonths")}
            className="expense-totals expense-totals-dashboard"
          >
            <div>
              <dt>{t("expense.outstandingPersonal")}</dt>
              <dd>
                {formatSatangAsCurrency(
                  outstandingTotals.outstandingPersonalSatang,
                  locale,
                )}
              </dd>
            </div>
            <div>
              <dt>{t("expense.outstandingCollection")}</dt>
              <dd>
                {formatSatangAsCurrency(
                  outstandingTotals.outstandingCollectionSatang,
                  locale,
                )}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section aria-labelledby="expense-month-title" className="expense-history">
        <div className="expense-history-heading">
          <h2 id="expense-month-title">{t("expense.monthlyHistory")}</h2>
          <div>
            <label htmlFor="expense-month">{t("expense.month")}</label>
            <input
              id="expense-month"
              onChange={(event) => setMonth(event.target.value)}
              type="month"
              value={month}
            />
          </div>
        </div>
        <p className="expense-month-label">{formatBudgetMonth(month, locale)}</p>
        {isLoadingExpenses ? (
          <p role="status">{t("expense.loadingExpenses")}</p>
        ) : (
          <>
            <dl
              aria-label={t("expense.monthlyTotals")}
              className="expense-totals expense-totals-dashboard"
            >
              <div>
                <dt>{t("expense.totalCharged")}</dt>
                <dd>{formatSatangAsCurrency(totals.chargedSatang, locale)}</dd>
              </div>
              <div>
                <dt>{t("expense.personalTotal")}</dt>
                <dd>{formatSatangAsCurrency(totals.personalSatang, locale)}</dd>
              </div>
            </dl>
            <p className="settings-description expense-settlement-hint">
              {t("expense.settlementHint")}
            </p>
            <div
              aria-label={t("expense.tableLabel")}
              className="table-scroll"
              role="region"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t("expense.tableDate")}</th>
                    <th scope="col">{t("expense.tableMerchant")}</th>
                    <th scope="col">{t("expense.tableSplit")}</th>
                    <th scope="col">{t("expense.totalCharged")}</th>
                    <th scope="col">{t("expense.personalTotal")}</th>
                    <th scope="col">{t("expense.settlement")}</th>
                    <th scope="col">{t("expense.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td data-label={t("expense.tableDate")}>
                        {getDateLabel(expense.purchaseDate, locale)}
                      </td>
                      <td data-label={t("expense.tableMerchant")}>
                        {expense.merchantName}
                      </td>
                      <td data-label={t("expense.tableSplit")}>
                        {expense.isShared
                          ? t("expense.sharedWithCount", {
                              count: expense.peopleCount,
                            })
                          : t("expense.notShared")}
                      </td>
                      <td data-label={t("expense.totalCharged")}>
                        {formatSatangAsCurrency(expense.amountSatang, locale)}
                      </td>
                      <td data-label={t("expense.personalTotal")}>
                        {formatSatangAsCurrency(
                          expense.personalAmountSatang,
                          locale,
                        )}
                      </td>
                      <td data-label={t("expense.settlement")}>
                        <label
                          className={`expense-settled-option ${
                            expense.isSettled
                              ? "is-settled"
                              : "is-outstanding"
                          }`}
                        >
                          <input
                            checked={expense.isSettled}
                            disabled={
                              isUpdatingSettlementId === expense.id ||
                              isDeletingExpenseId === expense.id
                            }
                            onChange={(event) =>
                              void handleSettlementChange(
                                expense,
                                event.target.checked,
                              )
                            }
                            type="checkbox"
                          />
                          {t("expense.fullySettled")}
                        </label>
                      </td>
                      <td data-label={t("expense.actions")}>
                        <div className="expense-row-actions">
                          <button
                            aria-label={t("expense.editExpenseLabel", {
                              merchant: expense.merchantName,
                            })}
                            className="button button-secondary"
                            disabled={
                              isSavingExpense || isDeletingExpenseId !== null
                            }
                            onClick={() => beginEdit(expense)}
                            type="button"
                          >
                            {t("expense.edit")}
                          </button>
                          <button
                            aria-label={t("expense.deleteExpenseLabel", {
                              merchant: expense.merchantName,
                            })}
                            className="button button-danger"
                            disabled={
                              isSavingExpense || isDeletingExpenseId !== null
                            }
                            onClick={() => void handleDeleteExpense(expense)}
                            type="button"
                          >
                            {isDeletingExpenseId === expense.id
                              ? t("expense.deleting")
                              : t("expense.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td className="empty-row" colSpan={7}>
                        {t("expense.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
