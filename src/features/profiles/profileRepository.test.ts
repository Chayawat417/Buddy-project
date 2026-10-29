import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
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

describe("profile repository", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("creates and lists profiles with normalized names", async () => {
    const profile = await createProfile("  Alex  ");

    await expect(listProfiles()).resolves.toEqual([profile]);
    expect(profile.name).toBe("Alex");
  });

  it("rejects blank, long, and duplicate profile names", async () => {
    await expect(createProfile("   ")).rejects.toBeInstanceOf(ProfileNameError);
    await expect(createProfile("a".repeat(41))).rejects.toMatchObject({
      code: "tooLong",
    });
    await createProfile("Alex");
    await expect(createProfile(" alex ")).rejects.toBeInstanceOf(
      ProfileAlreadyExistsError,
    );
  });

  it("renames a profile and rejects unknown profile ids", async () => {
    const profile = await createProfile("Alex");
    const renamed = await renameProfile(profile.id, "Alex Family");

    expect(renamed.name).toBe("Alex Family");
    expect(renamed.updatedAt).toBeGreaterThanOrEqual(profile.updatedAt);
    await expect(renameProfile("missing", "Unknown")).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });

  it("stores active profile selection and clears it on deletion", async () => {
    const profile = await createProfile("Alex");
    await setActiveProfileId(profile.id);
    await expect(getActiveProfileId()).resolves.toBe(profile.id);

    await deleteProfile(profile.id);

    await expect(getActiveProfileId()).resolves.toBeNull();
    await expect(listProfiles()).resolves.toEqual([]);
  });

  it("keeps profile records separate", async () => {
    const first = await createProfile("Alex");
    const second = await createProfile("Sam");

    await deleteProfile(first.id);

    await expect(listProfiles()).resolves.toEqual([second]);
  });
});
