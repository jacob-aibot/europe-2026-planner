export type LocalIdentityV1 = {
  version: 1;
  displayName: string;
  homeCity: string;
  bio: string;
  welcomeDismissed: boolean;
};

export const IDENTITY_KEY = 'cairn.local-identity.v1';
export const EMPTY_IDENTITY: LocalIdentityV1 = {
  version: 1,
  displayName: '',
  homeCity: '',
  bio: '',
  welcomeDismissed: false,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function parseIdentity(raw: string | null): LocalIdentityV1 {
  if (raw === null) return { ...EMPTY_IDENTITY };
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error('The profile saved on this device could not be read.'); }
  if (!value || typeof value !== 'object') throw new Error('The profile saved on this device could not be read.');
  const row = value as Record<string, unknown>;
  if (row.version !== 1 || typeof row.displayName !== 'string' || typeof row.homeCity !== 'string' ||
      typeof row.bio !== 'string' || typeof row.welcomeDismissed !== 'boolean') {
    throw new Error('The profile saved on this device could not be read.');
  }
  if (row.displayName.length > 80 || row.homeCity.length > 120 || row.bio.length > 240) {
    throw new Error('The profile saved on this device exceeds its field limits.');
  }
  return { version: 1, displayName: row.displayName, homeCity: row.homeCity, bio: row.bio, welcomeDismissed: row.welcomeDismissed };
}

export function readIdentity(storage: StorageLike = window.localStorage): LocalIdentityV1 {
  return parseIdentity(storage.getItem(IDENTITY_KEY));
}

export function writeIdentity(input: LocalIdentityV1, storage: StorageLike = window.localStorage): LocalIdentityV1 {
  const value = {
    version: 1 as const,
    displayName: input.displayName.trim(),
    homeCity: input.homeCity.trim(),
    bio: input.bio.trim(),
    welcomeDismissed: input.welcomeDismissed,
  };
  if (value.displayName.length > 80 || value.homeCity.length > 120 || value.bio.length > 240) {
    throw new Error('Profile fields are longer than Cairn can save.');
  }
  storage.setItem(IDENTITY_KEY, JSON.stringify(value));
  return value;
}

export function identityInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length ? (words.length === 1 ? words[0][0] : words[0][0] + words.at(-1)![0]).toLocaleUpperCase() : '';
}
