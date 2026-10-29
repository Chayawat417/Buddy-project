import Dexie from "dexie";
import { buddyDatabase, type ProfileRecord } from "../../data/buddyDatabase";

const activeProfileSettingKey = "activeProfileId";
const maximumProfileNameLength = 40;

export type ProfileNameErrorCode = "required" | "tooLong";

export class ProfileNameError extends Error {
  constructor(readonly code: ProfileNameErrorCode) {
    super(code);
    this.name = "ProfileNameError";
  }
}

export class ProfileAlreadyExistsError extends Error {
  constructor() {
    super("A profile with this name already exists.");
    this.name = "ProfileAlreadyExistsError";
  }
}

export class ProfileNotFoundError extends Error {
  constructor() {
    super("The requested profile does not exist.");
    this.name = "ProfileNotFoundError";
  }
}

function normalizeProfileName(name: string): { name: string; nameKey: string } {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new ProfileNameError("required");
  }

  if (normalizedName.length > maximumProfileNameLength) {
    throw new ProfileNameError("tooLong");
  }

  return { name: normalizedName, nameKey: normalizedName.toLowerCase() };
}

function throwIfDuplicateName(error: unknown): void {
  if (error instanceof Dexie.ConstraintError) {
    throw new ProfileAlreadyExistsError();
  }
}

export async function listProfiles(): Promise<ProfileRecord[]> {
  return buddyDatabase.profiles.orderBy("createdAt").toArray();
}

export async function createProfile(name: string): Promise<ProfileRecord> {
  const normalized = normalizeProfileName(name);
  const now = Date.now();
  const profile: ProfileRecord = {
    id: crypto.randomUUID(),
    ...normalized,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await buddyDatabase.profiles.add(profile);
  } catch (error) {
    throwIfDuplicateName(error);
    throw error;
  }

  return profile;
}

export async function renameProfile(
  profileId: string,
  name: string,
): Promise<ProfileRecord> {
  const normalized = normalizeProfileName(name);

  try {
    return await buddyDatabase.transaction("rw", buddyDatabase.profiles, async () => {
      const existing = await buddyDatabase.profiles.get(profileId);
      if (!existing) {
        throw new ProfileNotFoundError();
      }

      const updated: ProfileRecord = {
        ...existing,
        ...normalized,
        updatedAt: Date.now(),
      };
      await buddyDatabase.profiles.put(updated);
      return updated;
    });
  } catch (error) {
    throwIfDuplicateName(error);
    throw error;
  }
}

export async function deleteProfile(profileId: string): Promise<void> {
  await buddyDatabase.transaction(
    "rw",
    buddyDatabase.profiles,
    buddyDatabase.budgetPlans,
    buddyDatabase.allocations,
    buddyDatabase.settings,
    async () => {
      const existing = await buddyDatabase.profiles.get(profileId);
      if (!existing) {
        throw new ProfileNotFoundError();
      }

      await buddyDatabase.profiles.delete(profileId);
      await buddyDatabase.budgetPlans.where("profileId").equals(profileId).delete();
      await buddyDatabase.allocations.where("profileId").equals(profileId).delete();
      const activeProfile = await buddyDatabase.settings.get(activeProfileSettingKey);
      if (activeProfile?.value === profileId) {
        await buddyDatabase.settings.delete(activeProfileSettingKey);
      }
    },
  );
}

export async function getActiveProfileId(): Promise<string | null> {
  const setting = await buddyDatabase.settings.get(activeProfileSettingKey);
  return setting?.value ?? null;
}

export async function setActiveProfileId(profileId: string | null): Promise<void> {
  if (profileId === null) {
    await buddyDatabase.settings.delete(activeProfileSettingKey);
    return;
  }

  const profile = await buddyDatabase.profiles.get(profileId);
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  await buddyDatabase.settings.put({
    key: activeProfileSettingKey,
    value: profileId,
  });
}
