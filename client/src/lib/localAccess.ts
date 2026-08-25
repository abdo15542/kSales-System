export type AccessRole = "owner" | "user";

export type LocalAccessProfile = {
  version: 1;
  role: AccessRole;
  username: string;
  salt: string;
  passwordHash: string;
  expiresAt?: string;
  deviceId: string;
  deviceProof: string;
  issuedAt: string;
};

export type DeviceRequest = {
  version: 1;
  deviceId: string;
  deviceProof: string;
  createdAt: string;
};

export type ActivationPayload = {
  version: 1;
  role: "user";
  username: string;
  salt: string;
  passwordHash: string;
  expiresAt: string;
  deviceId: string;
  deviceProof: string;
  issuedAt: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const encodeLocalAccessCode = (value: DeviceRequest | ActivationPayload) => bytesToBase64Url(encoder.encode(JSON.stringify(value)));

export const decodeLocalAccessCode = <T extends DeviceRequest | ActivationPayload>(code: string): T | null => {
  try {
    const parsed = JSON.parse(decoder.decode(base64UrlToBytes(code.trim()))) as T;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
};

export const makeRandomToken = (size = 24) => bytesToBase64Url(crypto.getRandomValues(new Uint8Array(size)));

export const hashLocalAccessValue = async (value: string) => bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));

export const createDeviceRequest = async (deviceId = makeRandomToken()) => {
  const deviceSecret = makeRandomToken();
  const deviceProof = await hashLocalAccessValue(deviceSecret);
  return { deviceId, deviceSecret, request: { version: 1 as const, deviceId, deviceProof, createdAt: new Date().toISOString() } };
};

export const createOwnerProfile = async (username: string, password: string, deviceId: string, deviceProof: string): Promise<LocalAccessProfile> => {
  const salt = makeRandomToken(16);
  return { version: 1, role: "owner", username: username.trim(), salt, passwordHash: await hashLocalAccessValue(`${salt}:${password}`), deviceId, deviceProof, issuedAt: new Date().toISOString() };
};

export const createActivationPayload = async (request: DeviceRequest, username: string, password: string, expiresAt: string): Promise<ActivationPayload> => {
  const salt = makeRandomToken(16);
  return { version: 1, role: "user", username: username.trim(), salt, passwordHash: await hashLocalAccessValue(`${salt}:${password}`), expiresAt, deviceId: request.deviceId, deviceProof: request.deviceProof, issuedAt: new Date().toISOString() };
};

export const activateDevice = (payload: ActivationPayload, deviceId: string, deviceProof: string): LocalAccessProfile | null => payload.role === "user" && payload.deviceId === deviceId && payload.deviceProof === deviceProof && !isAccessExpired(payload) ? payload : null;

export const isAccessExpired = (profile: Pick<LocalAccessProfile, "expiresAt">) => Boolean(profile.expiresAt && new Date(profile.expiresAt).getTime() <= Date.now());

export const verifyLocalAccessLogin = async (profile: LocalAccessProfile, username: string, password: string) => !isAccessExpired(profile) && profile.username === username.trim() && profile.passwordHash === await hashLocalAccessValue(`${profile.salt}:${password}`);
