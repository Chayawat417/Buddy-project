import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AllocationRecord } from "../../data/buddyDatabase";
import {
  calculateAllocationTotals,
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

function getErrorMessage(error: unknown): string {
  if (error instanceof MoneyInputError) {
    return "กรุณากรอกจำนวนเงินตั้งแต่ 0 บาทขึ้นไป โดยมีทศนิยมไม่เกิน 2 ตำแหน่ง";
  }
  if (error instanceof AllocationNameError) {
    return error.code === "required"
      ? "กรุณากรอกชื่อหมวดงบประมาณ"
      : "ชื่อหมวดงบประมาณต้องไม่เกิน 60 ตัวอักษร";
  }
  if (error instanceof AllocationAlreadyExistsError) {
    return "มีหมวดงบประมาณชื่อนี้ในเดือนดังกล่าวแล้ว";
  }
  if (error instanceof InvalidBudgetMonthError) {
    return "เดือนที่เลือกไม่ถูกต้อง";
  }
  return "บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง";
}

export function useAllocationPlanner(profileId: string, month: string) {
  const [income, setIncome] = useState("");
  const [hasIncome, setHasIncome] = useState(false);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [allocationDraftAmounts, setAllocationDraftAmounts] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCopyingPreviousMonth, setIsCopyingPreviousMonth] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBudget(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
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
        if (isMounted) setErrorMessage(getErrorMessage(error));
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
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const incomeSatang = parseBahtToSatang(income);
      await saveMonthlyIncome(profileId, month, incomeSatang);
      setIncome(formatSatangAsBahtInput(incomeSatang));
      setHasIncome(true);
      setSuccessMessage("บันทึกรายได้แล้ว");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleCopyPreviousMonth(): Promise<void> {
    setErrorMessage("");
    setSuccessMessage("");
    setIsCopyingPreviousMonth(true);
    try {
      const result = await copyPreviousMonthAllocations(profileId, month);
      setAllocations((current) => [
        ...current,
        ...result.copiedAllocations,
      ]);
      if (result.sourceCount === 0) {
        setSuccessMessage("เดือนก่อนยังไม่มีหมวดงบประมาณให้คัดลอก");
      } else if (result.copiedAllocations.length === 0) {
        setSuccessMessage("หมวดจากเดือนก่อนมีอยู่ในเดือนนี้ครบแล้ว");
      } else {
        const skippedMessage =
          result.skippedCount > 0
            ? ` (ข้ามหมวดซ้ำ ${result.skippedCount} หมวด)`
            : "";
        setSuccessMessage(
          `คัดลอก ${result.copiedAllocations.length} หมวดจากเดือน ${result.sourceMonth} แล้ว${skippedMessage}`,
        );
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCopyingPreviousMonth(false);
    }
  }

  async function handleAddAllocation(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const amountSatang = parseBahtToSatang(newAmount);
      await createAllocation(profileId, month, newName, amountSatang);
      await reloadBudget();
      setNewName("");
      setNewAmount("");
      setSuccessMessage("บันทึกแล้ว");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleSaveAllocation(
    allocationId: string,
    name: string,
    amount: string,
  ): Promise<void> {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await updateAllocation(
        profileId,
        month,
        allocationId,
        name,
        parseBahtToSatang(amount),
      );
      await reloadBudget();
      setSuccessMessage("บันทึกแล้ว");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
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
    if (!window.confirm(`ลบหมวด "${allocation.name}" หรือไม่?`)) return;

    setErrorMessage("");
    setSuccessMessage("");
    try {
      await deleteAllocation(profileId, month, allocation.id);
      await reloadBudget();
      setSuccessMessage("ลบหมวดงบประมาณแล้ว");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return {
    allocatedSatang,
    allocations,
    errorMessage,
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
    successMessage,
    totals,
  };
}
