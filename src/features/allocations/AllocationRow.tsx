import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type {
  AllocationRecord,
  BudgetCategoryRecord,
} from "../../data/buddyDatabase";
import {
  formatSatangAsBahtInput,
  parseBahtToSatang,
} from "../../domain/money";

interface AllocationRowProps {
  allocation: AllocationRecord;
  categories: BudgetCategoryRecord[];
  index: number;
  onAmountChange: (allocationId: string, amount: string) => void;
  onSave: (allocationId: string, name: string, amount: string) => Promise<void>;
  onDelete: (allocation: AllocationRecord) => Promise<void>;
}

export default function AllocationRow({
  allocation,
  categories,
  index,
  onAmountChange,
  onSave,
  onDelete,
}: AllocationRowProps) {
  const [name, setName] = useState(allocation.name);
  const [amount, setAmount] = useState(
    formatSatangAsBahtInput(allocation.amountSatang),
  );
  let hasAmountChanged = true;
  try {
    hasAmountChanged =
      parseBahtToSatang(amount) !== allocation.amountSatang;
  } catch {
    hasAmountChanged = true;
  }
  const hasUnsavedChanges = name !== allocation.name || hasAmountChanged;

  useEffect(() => {
    setName(allocation.name);
    setAmount(formatSatangAsBahtInput(allocation.amountSatang));
  }, [allocation]);

  function save(): void {
    void onSave(allocation.id, name, amount);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
  }

  return (
    <tr>
      <td>
        <label className="visually-hidden" htmlFor={`allocation-name-${allocation.id}`}>
          ชื่อหมวดที่ {index + 1}
        </label>
        <select
          id={`allocation-name-${allocation.id}`}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        >
          {!categories.some((category) => category.name === allocation.name) && (
            <option value={allocation.name}>{allocation.name} (หมวดเดิม)</option>
          )}
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label
          className="visually-hidden"
          htmlFor={`allocation-amount-${allocation.id}`}
        >
          จำนวนเงินหมวดที่ {index + 1} บาท
        </label>
        <input
          id={`allocation-amount-${allocation.id}`}
          inputMode="decimal"
          onChange={(event) => {
            const nextAmount = event.target.value;
            setAmount(nextAmount);
            onAmountChange(allocation.id, nextAmount);
          }}
          onKeyDown={submitOnEnter}
          type="text"
          value={amount}
        />
      </td>
      <td className="allocation-actions">
        {hasUnsavedChanges && (
          <button
            aria-label={`บันทึกหมวด ${name}`}
            className="button button-secondary"
            onClick={save}
            type="button"
          >
            บันทึก
          </button>
        )}
        <button
          aria-label={`ลบหมวด ${name}`}
          className="button button-danger"
          onClick={() => void onDelete(allocation)}
          type="button"
        >
          ลบ
        </button>
      </td>
    </tr>
  );
}
