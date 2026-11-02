import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AllocationRecord } from "../../data/buddyDatabase";
import { useLanguage } from "../../i18n";
import type { TranslationKey } from "../../i18n";
import {
  calculateAllocationTotals,
  formatBudgetMonth,
  formatSatangAsBahtInput,
  MoneyInputError,
  parseBahtToSatang,
} from "../../domain/money";
import {
  AllocationAlreadyExistsError,
  AllocationNameError,
  copyPreviousMonthAllocations,
  createAllocation,
  deleteAllocation,
  getMonthlyBudget,
  InvalidBudgetMonthError,
  saveMonthlyIncome,
  updateAllocation,
} from "./allocationRepository";

function getErrorMessageKey(error: unknown): TranslationKey {
  if (error instanceof MoneyInputError) {
    return "budget.error.money";
  }
  if (error instanceof AllocationNameError) {
    return error.code === "required"
      ? "budget.error.nameRequired"
      : "budget.error.nameTooLong";
  }
  if (error instanceof AllocationAlreadyExistsError) {
    return "budget.error.duplicate";
  }
  if (error instanceof InvalidBudgetMonthError) {
    return "budget.error.invalidMonth";
  }
  return "budget.error.save";
}

interface LocalizedMessage {
  key: TranslationKey;
  params?: Readonly<Record<string, string | number>>;
}

export function useAllocationPlanner(profileId: string, month: string) {
  const { locale, t } = useLanguage();
  const [income, setIncome] = useState("");
  const [hasIncome, setHasIncome] = useState(false);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [allocationDraftAmounts, setAllocationDraftAmounts] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCopyingPreviousMonth, setIsCopyingPreviousMonth] = useState(false);
  const [errorMessage, setErrorMessage] = useState<LocalizedMessage | null>(null);
  const [successMessage, setSuccessMessage] = useState<LocalizedMessage | null>(null);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBudget(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setIncome("");
      setHasIncome(false);
      setAllocations([]);
      setAllocationDraftAmounts({});
      try {
        const snapshot = await getMonthlyBudget(profileId, month);
        if (isMounted) {
          setIncome(
            snapshot.plan
              ? formatSatangAsBahtInput(snapshot.plan.incomeSatang)
              : "",
          );
          setHasIncome(snapshot.plan !== null);
          setAllocations(snapshot.allocations);
        }
      } catch (error) {
        if (isMounted) setErrorMessage({ key: getErrorMessageKey(error) });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadBudget();
    return () => {
      isMounted = false;
    };
  }, [profileId, month]);

  let incomeSatang: number | null = hasIncome ? 0 : null;
  if (income !== "") {
    try {
      incomeSatang = parseBahtToSatang(income);
    } catch {
      incomeSatang = null;
    }
  }

  const allocationAmounts = allocations.map(
    (allocation) =>
      allocationDraftAmounts[allocation.id] ?? allocation.amountSatang,
  );
  const allocatedSatang = allocationAmounts.reduce(
    (total, amount) => total + amount,
    0,
  );
  const totals =
    incomeSatang === null
      ? null
      : calculateAllocationTotals(incomeSatang, allocationAmounts);

  async function reloadBudget(): Promise<void> {
    const snapshot = await getMonthlyBudget(profileId, month);
    setAllocations(snapshot.allocations);
    setAllocationDraftAmounts({});
    setIncome(
      snapshot.plan ? formatSatangAsBahtInput(snapshot.plan.incomeSatang) : "",
    );
    setHasIncome(snapshot.plan !== null);
  }

  async function handleIncomeSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const incomeSatang = parseBahtToSatang(income);
      await saveMonthlyIncome(profileId, month, incomeSatang);
      setIncome(formatSatangAsBahtInput(incomeSatang));
      setHasIncome(true);
      setSuccessMessage({ key: "budget.incomeSaved" });
    } catch (error) {
      setErrorMessage({ key: getErrorMessageKey(error) });
    }
  }

  async function handleCopyPreviousMonth(): Promise<void> {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCopyingPreviousMonth(true);
    try {
      const result = await copyPreviousMonthAllocations(profileId, month);
      setAllocations((current) =>
        [...current, ...result.copiedAllocations].sort(
          (left, right) => left.createdAt - right.createdAt,
        ),
      );
      if (result.sourceCount === 0) {
        setSuccessMessage({ key: "budget.copiedNone" });
      } else if (result.copiedAllocations.length === 0) {
        setSuccessMessage({ key: "budget.copiedAll" });
      } else {
        setSuccessMessage({
          key: result.skippedCount > 0
            ? "budget.copiedSomeWithSkipped"
            : "budget.copiedSome",
          params: {
            count: result.copiedAllocations.length,
            month: result.sourceMonth,
            skippedCount: result.skippedCount,
            skipped: "",
          },
        });
      }
    } catch (error) {
      setErrorMessage({ key: getErrorMessageKey(error) });
    } finally {
      setIsCopyingPreviousMonth(false);
    }
  }

  async function handleAddAllocation(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const amountSatang = parseBahtToSatang(newAmount);
      await createAllocation(profileId, month, newName, amountSatang);
      await reloadBudget();
      setNewName("");
      setNewAmount("");
      setSuccessMessage({ key: "budget.saved" });
    } catch (error) {
      setErrorMessage({ key: getErrorMessageKey(error) });
    }
  }

  async function handleSaveAllocation(
    allocationId: string,
    name: string,
    amount: string,
  ): Promise<void> {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateAllocation(
        profileId,
        month,
        allocationId,
        name,
        parseBahtToSatang(amount),
      );
      await reloadBudget();
      setSuccessMessage({ key: "budget.saved" });
    } catch (error) {
      setErrorMessage({ key: getErrorMessageKey(error) });
    }
  }

  function handleAllocationAmountChange(
    allocationId: string,
    amount: string,
  ): void {
    try {
      const amountSatang = parseBahtToSatang(amount);
      setAllocationDraftAmounts((current) => ({
        ...current,
        [allocationId]: amountSatang,
      }));
    } catch {
      setAllocationDraftAmounts((current) => {
        const next = { ...current };
        delete next[allocationId];
        return next;
      });
    }
  }

  async function handleDeleteAllocation(
    allocation: AllocationRecord,
  ): Promise<void> {
    if (!window.confirm(t("budget.deleteConfirm", { name: allocation.name }))) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteAllocation(profileId, month, allocation.id);
      await reloadBudget();
      setSuccessMessage({ key: "budget.deleted" });
    } catch (error) {
      setErrorMessage({ key: getErrorMessageKey(error) });
    }
  }

  return {
    allocatedSatang,
    allocations,
    errorMessage: errorMessage ? t(errorMessage.key, errorMessage.params) : "",
    handleAddAllocation,
    handleAllocationAmountChange,
    handleCopyPreviousMonth,
    handleDeleteAllocation,
    handleIncomeSubmit,
    handleSaveAllocation,
    income,
    incomeSatang,
    isLoading,
    isCopyingPreviousMonth,
    newAmount,
    newName,
    setIncome,
    setNewAmount,
    setNewName,
    successMessage: successMessage
      ? t(successMessage.key, {
          ...successMessage.params,
          ...(typeof successMessage.params?.month === "string"
            ? {
                month: formatBudgetMonth(
                  successMessage.params.month,
                  locale,
                ),
              }
            : {}),
        })
      : "",
    totals,
  };
}
