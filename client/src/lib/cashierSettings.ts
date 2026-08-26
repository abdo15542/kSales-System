export const LOCAL_CASHIER_SETTINGS_KEY = "souqna-cashier-settings-v1";

export type CashierFontScale = "normal" | "large" | "extra-large";
export type CashierCartWidth = "compact" | "standard" | "wide";
export type CashierShortcutAction = "focus-search" | "open-scanner" | "new-sale" | "confirm-sale" | "suspend-sale" | "open-price-lookup" | "open-returns" | "open-product-form" | "cash-payment" | "card-payment" | "toggle-fullscreen" | "print-invoice";
export type CashierShortcut = "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12" | "Alt+B" | "Alt+H" | "Alt+Enter" | "Ctrl+Enter" | "none";
export type DesktopInvoiceFunctionKey = "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12";

export type CashierSettings = {
  fontScale: CashierFontScale;
  cartWidth: CashierCartWidth;
  shortcuts: Record<CashierShortcutAction, CashierShortcut>;
};

export const CASHIER_FONT_SCALE_LABELS: Record<CashierFontScale, string> = {
  normal: "عادي",
  large: "كبير",
  "extra-large": "كبير جدًا",
};

export const CASHIER_CART_WIDTH_LABELS: Record<CashierCartWidth, string> = {
  compact: "مضغوط",
  standard: "متوسط",
  wide: "عريض",
};

export const CASHIER_SHORTCUT_ACTION_LABELS: Record<CashierShortcutAction, string> = {
  "focus-search": "تركيز البحث",
  "open-scanner": "فتح ماسح الكاميرا",
  "new-sale": "فاتورة بيع جديدة",
  "suspend-sale": "تعليق السلة",
  "confirm-sale": "تأكيد البيع",
  "open-price-lookup": "استعلام السعر",
  "open-returns": "فتح شاشة الترجيع",
  "open-product-form": "إضافة صنف جديد",
  "cash-payment": "اختيار الدفع النقدي",
  "card-payment": "اختيار الدفع بالبطاقة",
  "toggle-fullscreen": "شاشة الكاشير",
  "print-invoice": "طباعة الفاتورة",
};

export const CASHIER_SHORTCUT_OPTIONS: Array<{ value: CashierShortcut; label: string }> = [
  { value: "F1", label: "F1" }, { value: "F2", label: "F2" }, { value: "F3", label: "F3" }, { value: "F4", label: "F4" }, { value: "F5", label: "F5" }, { value: "F6", label: "F6" }, { value: "F7", label: "F7" }, { value: "F8", label: "F8" }, { value: "F9", label: "F9" }, { value: "F10", label: "F10" }, { value: "F11", label: "F11" }, { value: "F12", label: "F12" },
  { value: "Alt+B", label: "Alt + B" }, { value: "Alt+H", label: "Alt + H" }, { value: "Alt+Enter", label: "Alt + Enter" }, { value: "Ctrl+Enter", label: "Ctrl + Enter" }, { value: "none", label: "بدون اختصار" },
];

export const DEFAULT_CASHIER_SETTINGS: CashierSettings = {
  fontScale: "normal",
  cartWidth: "standard",
  shortcuts: { "focus-search": "F1", "open-scanner": "F2", "new-sale": "F3", "confirm-sale": "F4", "suspend-sale": "F5", "open-price-lookup": "F6", "open-returns": "F7", "open-product-form": "F8", "cash-payment": "F9", "card-payment": "F10", "toggle-fullscreen": "F11", "print-invoice": "F12" },
};

const shortcutValues = new Set<CashierShortcut>(CASHIER_SHORTCUT_OPTIONS.map((option) => option.value));
const actionValues = Object.keys(CASHIER_SHORTCUT_ACTION_LABELS) as CashierShortcutAction[];

export function normalizeCashierSettings(value: unknown): CashierSettings {
  if (!value || typeof value !== "object") return DEFAULT_CASHIER_SETTINGS;
  const candidate = value as Partial<CashierSettings>;
  const fontScale: CashierFontScale = candidate.fontScale === "large" || candidate.fontScale === "extra-large" ? candidate.fontScale : "normal";
  const cartWidth: CashierCartWidth = candidate.cartWidth === "compact" || candidate.cartWidth === "wide" ? candidate.cartWidth : "standard";
  const shortcuts = { ...DEFAULT_CASHIER_SETTINGS.shortcuts };
  if (candidate.shortcuts && typeof candidate.shortcuts === "object") {
    const used = new Set<CashierShortcut>();
    actionValues.forEach((action) => {
      const shortcut = candidate.shortcuts?.[action];
      if (shortcut && shortcutValues.has(shortcut) && (shortcut === "none" || !used.has(shortcut))) {
        shortcuts[action] = shortcut;
        if (shortcut !== "none") used.add(shortcut);
      }
    });
  }
  return { fontScale, cartWidth, shortcuts };
}

export function parseCashierSettings(raw: string | null): CashierSettings {
  if (!raw) return DEFAULT_CASHIER_SETTINGS;
  try { return normalizeCashierSettings(JSON.parse(raw)); } catch { return DEFAULT_CASHIER_SETTINGS; }
}

export function updateCashierShortcut(settings: CashierSettings, action: CashierShortcutAction, shortcut: CashierShortcut): CashierSettings {
  const shortcuts = { ...settings.shortcuts };
  if (shortcut !== "none") {
    actionValues.forEach((item) => { if (item !== action && shortcuts[item] === shortcut) shortcuts[item] = "none"; });
  }
  shortcuts[action] = shortcut;
  return normalizeCashierSettings({ ...settings, shortcuts });
}

export function matchesCashierShortcut(event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey">, shortcut: CashierShortcut): boolean {
  if (shortcut === "none") return false;
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (shortcut.startsWith("Alt+")) return event.altKey && !event.ctrlKey && !event.metaKey && key === shortcut.slice(4);
  if (shortcut.startsWith("Ctrl+")) return (event.ctrlKey || event.metaKey) && !event.altKey && key === shortcut.slice(5);
  return !event.altKey && !event.ctrlKey && !event.metaKey && key === shortcut;
}

const desktopInvoiceFunctionKeys = new Set<DesktopInvoiceFunctionKey>(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"]);

export function getDesktopInvoiceFunctionKey(event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey">): DesktopInvoiceFunctionKey | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  const key = event.key.toUpperCase() as DesktopInvoiceFunctionKey;
  return desktopInvoiceFunctionKeys.has(key) ? key : null;
}
