import { describe, expect, it } from "vitest";
import type { AllocationRecord } from "../data/buddyDatabase";
import { sortAllocations } from "./allocationSort";

function allocation(
  id: string,
  values: Partial<AllocationRecord> = {},
): AllocationRecord {
  return {
    id,
    profileId: "profile-1",
    month: "2026-11",
    number: "",
    type: "",
    subnumber: "",
    itemType: "",
    name: id,
    nameKey: id.toLowerCase(),
    amountSatang: 0,
    createdAt: 1,
    updatedAt: 1,
    ...values,
  };
}

describe("allocation sorting", () => {
  it("sorts hierarchical numbers by numeric segments", () => {
    const records = [
      allocation("ten", { number: "1.10" }),
      allocation("two", { number: "1.2" }),
      allocation("parent", { number: "1" }),
      allocation("huge", { number: "1.999999999999999999999999" }),
    ];

    expect(
      sortAllocations(records, [{ field: "number", direction: "asc" }]).map(
        ({ id }) => id,
      ),
    ).toEqual(["parent", "two", "ten", "huge"]);
  });

  it("uses each level in order and Thai collation for text", () => {
    const records = [
      allocation("thai-kho-khai", { number: "1", type: "ค่าใช้จ่าย" }),
      allocation("thai-ko-kai", { number: "1", type: "รายได้" }),
      allocation("later-number", { number: "2", type: "ค่าใช้จ่าย" }),
    ];

    expect(
      sortAllocations(
        records,
        [
          { field: "number", direction: "asc" },
          { field: "type", direction: "asc" },
        ],
      ).map(({ id }) => id),
    ).toEqual(["thai-kho-khai", "thai-ko-kai", "later-number"]);
  });

  it("keeps blank values last for descending order and preserves stable ties", () => {
    const records = [
      allocation("first-blank", { number: "" }),
      allocation("number-one", { number: "1" }),
      allocation("number-three", { number: "3" }),
      allocation("second-blank", { number: "" }),
    ];

    expect(
      sortAllocations(records, [{ field: "number", direction: "desc" }]).map(
        ({ id }) => id,
      ),
    ).toEqual(["number-three", "number-one", "first-blank", "second-blank"]);
  });
});
