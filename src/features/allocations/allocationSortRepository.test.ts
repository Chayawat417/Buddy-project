import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import {
  AllocationSortPresetError,
  createAllocationSortPreset,
  deleteAllocationSortPreset,
  getAllocationSortPreferences,
  renameAllocationSortPreset,
  setDefaultAllocationSortPreset,
  updateAllocationSortPresetRules,
} from "./allocationSortRepository";

describe("allocation sort preset repository", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("creates, renames, selects, and deletes presets", async () => {
    const initial = await getAllocationSortPreferences();
    const created = await createAllocationSortPreset("เรียงตามยอด", [
      { field: "amountSatang", direction: "desc" },
    ]);
    const secondPreset = created.presets[1];

    expect(created.presets).toHaveLength(2);
    expect(created.defaultPresetId).toBe(initial.defaultPresetId);

    const renamed = await renameAllocationSortPreset(
      secondPreset.id,
      "ยอดสูงก่อน",
    );
    expect(renamed.presets[1].name).toBe("ยอดสูงก่อน");

    const selected = await setDefaultAllocationSortPreset(secondPreset.id);
    expect(selected.defaultPresetId).toBe(secondPreset.id);
    await expect(getAllocationSortPreferences()).resolves.toMatchObject({
      defaultPresetId: secondPreset.id,
      presets: [{ id: initial.defaultPresetId }, { id: secondPreset.id }],
    });

    const deleted = await deleteAllocationSortPreset(secondPreset.id);
    expect(deleted.presets).toHaveLength(1);
    expect(deleted.defaultPresetId).toBe(deleted.presets[0].id);
  });

  it("rejects duplicate names, duplicate fields, and deleting the last preset", async () => {
    const initial = await getAllocationSortPreferences();
    await expect(
      createAllocationSortPreset(initial.presets[0].name, [
        { field: "number", direction: "asc" },
      ]),
    ).rejects.toBeInstanceOf(AllocationSortPresetError);
    await expect(
      updateAllocationSortPresetRules(initial.defaultPresetId, [
        { field: "number", direction: "asc" },
        { field: "number", direction: "desc" },
      ]),
    ).rejects.toThrow();
    await expect(
      deleteAllocationSortPreset(initial.defaultPresetId),
    ).rejects.toMatchObject({ code: "last" });
  });
});
