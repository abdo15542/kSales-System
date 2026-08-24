export type LocalActionLockSettings = {
  enabled: boolean;
  salt: string;
  pinHash: string;
};

export const emptyLocalActionLockSettings: LocalActionLockSettings = {
  enabled: false,
  salt: "",
  pinHash: "",
};

export const isValidLocalPin = (pin: string) => /^\d{4,8}$/.test(pin);

export const makeLocalLockSalt = () => crypto.randomUUID();

export const hashLocalPin = async (pin: string, salt: string) => {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const isMatchingLocalPin = async (pin: string, settings: LocalActionLockSettings) => Boolean(settings.salt && settings.pinHash) && (await hashLocalPin(pin, settings.salt)) === settings.pinHash;
