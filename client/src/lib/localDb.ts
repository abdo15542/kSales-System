/**
 * سوقنا — قاعدة بيانات محلية حقيقية داخل المتصفح.
 * تُستخدم IndexedDB أولًا للعمل دون إنترنت، مع localStorage كخيار احتياطي آمن.
 */
const DATABASE_NAME = "souqna-offline-data";
const DATABASE_VERSION = 1;
const STORE_NAME = "records";

export const getLocalStorageFailureGuidance = (error: unknown) => {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "QuotaExceededError") return "تعذر حفظ آخر تغيير لأن مساحة بيانات هذا الموقع في المتصفح وصلت حدها. بياناتك الحالية لم تُحذف؛ حرر مساحة بيانات الموقع من إعدادات المتصفح ثم أعد المحاولة.";
  return "تعذر حفظ آخر تغيير محليًا. بياناتك الحالية لم تُحذف؛ أعد فتح التطبيق، ثم جرّب مرة أخرى أو أنشئ نسخة احتياطية عند عودة الحفظ.";
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readLocalRecord<T>(key: string): Promise<T | null> {
  try {
    const database = await openDatabase();
    return await new Promise<T | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  } catch {
    try {
      const fallback = localStorage.getItem(`souqna-db-${key}`);
      return fallback ? JSON.parse(fallback) as T : null;
    } catch {
      return null;
    }
  }
}

export async function writeLocalRecord<T>(key: string, value: T): Promise<void> {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    localStorage.setItem(`souqna-db-${key}`, JSON.stringify(value));
  }
}
