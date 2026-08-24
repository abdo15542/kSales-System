/**
 * فلسفة «دفتر الحي المعاصر»: واجهة عربية دافئة تشبه دفتر تشغيل منظم؛
 * مساحات ورقية، أخضر زيتوني، وأفعال تشغيل كبيرة وواضحة لصاحب المحل.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  BellRing,
  Camera,
  Bluetooth,
  Box,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  Pencil,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  TrendingUp,
  Undo2,
  Upload,
  UserRound,
  WalletCards,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { readLocalRecord, writeLocalRecord } from "@/lib/localDb";
import { validateStoreBackup } from "@/lib/backupValidation";
import { getPrintLayout } from "@/lib/printLayout";
import { inferThermalPaperWidth, makeDetectedPrinterProfile } from "@/lib/printerProfile";
import { getNearDepletionProducts, getRecurringCustomers, isBackupDueToday, isLocalProductImage } from "@/lib/operationalHelpers";
import { getReceiptLogoSizing, getReceiptLogoSource, isReceiptLogoDataUrl } from "@/lib/receiptLogo";
import { buildReceiptQrMarkup, buildReceiptQrPayload, makeReceiptQrDataUrl } from "@/lib/receiptQr";
import { buildReceiptPrintHtml } from "@/lib/receiptTemplate";
import { buildReceiptPdfLines } from "@/lib/receiptPdf";
import { buildDebtReminderUrl, getStocktakeDifference, getWeeklySummary } from "@/lib/weeklyOperations";
import { getWeekComparison, isWeeklyStocktakeDue } from "@/lib/weeklyPlanning";
import { buildShelfLabelsPrintHtml, labelSizePresets, type LabelSize } from "@/lib/shelfLabels";
import { createCode128Svg, getPrintableBarcodeValue } from "@/lib/labelBarcode";
import { getInactiveProducts, getMonthlyReport } from "@/lib/monthlyOperations";
import { getExpiryStatus, getExpiringProducts, getSupplierPurchaseList } from "@/lib/inventoryPlanning";
import { approveRequestedBatchWaste, cancelUnconsumedBatch, consumeBatchesFefo, getActiveBatches, getBatchHistory, getBatchRemainingTotal, getEarliestActiveExpiry, getExpirySortedBatchInventory, getExpiryWasteReport, getSupplierInventoryCostReport, isBatchEditable, reconcileBatchStocktake, requestExpiredBatchWaste, returnUnconsumedBatchToSupplier, updateUnconsumedBatch, type ProductBatch } from "@/lib/productBatches";
import { calculateSaleTotals } from "@/lib/saleTotals";
import { buildPriceChangeDrafts, isSettledDebt, type PriceChangeField } from "@/lib/storeHistory";
import { buildSupplierReturnNoticeHtml } from "@/lib/supplierReturnNotice";
import { getSupplierCreditStatus, getSupplierMonthlyStatement, type SupplierPayment } from "@/lib/supplierLedger";
import { CASH_DENOMINATIONS, getActiveCashDenominations, getCashClosingForDate, getCashDenominationTotal, getDailyCashSummary, getDailyExpenseLimitStatus, getMonthlyExpenseReport, type CashClosing, type CashDenominationCount, type CashExpense, type DebtCollection } from "@/lib/cashOperations";
import { getSupplierDueDateStatuses } from "@/lib/supplierDueDates";
import { getSupplierObligationReport, getSupplierPurchaseComparison, getSupplierPurchaseReport } from "@/lib/supplierPurchases";
import { getCashFlowForecast, getProductDemandInsights, getPurchaseRecommendations } from "@/lib/localAnalysis";
import { createBulkStocktakeRecords, createStocktakeRecord, getBulkStocktakeSummary, getDailyGoalProgress, getMonthlyGoalProgress, getSaleReturnableItems, getSaleReturnEligibility, getStocktakeRecordSummary, getStocktakeRunComparison, type DailySalesGoal, type MonthlySalesGoal, type StocktakeRecord } from "@/lib/localOperations";
import { getProductProfitability } from "@/lib/productProfitability";
import { emptyLocalActionLockSettings, hashLocalPin, isMatchingLocalPin, isValidLocalPin, makeLocalLockSalt, type LocalActionLockSettings } from "@/lib/localActionLock";
import { getCartQuantityOfferSummary, type QuantityOffer } from "@/lib/quantityOffers";
import { getCustomerStatement } from "@/lib/customerStatement";
import { getInventoryCategorySummary } from "@/lib/inventoryCategories";
import { getCustomerCreditStatus, normaliseCustomerCreditLimits } from "@/lib/customerCredit";
import { getStaffSalesReport } from "@/lib/staffSales";
import { getStaffReturnsReport } from "@/lib/staffReturns";
import { createBarcodeStocktakeDraft, getBarcodeStocktakeProgress, incrementBarcodeStocktakeCount, normaliseBarcodeStocktakeCounts, type BarcodeStocktakeDraft } from "@/lib/barcodeStocktake";
import { clampReturnCartQuantity, getReturnCartTotal } from "@/lib/saleReturnCart";
import { buildReturnReceiptRows, RETURN_REASON_PRESETS, searchReturnableSales } from "@/lib/returnEnhancements";
import { filterReturnSales, getReturnReasons } from "@/lib/returnAnalytics";
import { getHighReturnRateProducts, getMonthlyReturnComparison, getReturnReasonSummary } from "@/lib/advancedReturnAnalytics";
import { captureExternalBarcodeKey, type ExternalBarcodeBuffer } from "@/lib/externalBarcodeReader";
import { createSuspendedSaleDraft, filterQuickSaleProducts, getQuickSaleCategories, normaliseFavoriteProductIds, normaliseSuspendedSaleDrafts, restoreSuspendedCartItems, type SuspendedSaleDraft } from "@/lib/quickSale";
import BarcodeScanner from "@/components/BarcodeScanner";

type Page = "dashboard" | "sale" | "inventory" | "debts" | "reports" | "settings";
type PaymentMethod = "cash" | "credit";
type NotificationKind = "critical" | "warning" | "info";

type NotificationPreferences = {
  stock: boolean;
  debts: boolean;
  backup: boolean;
  cash: boolean;
  goals: boolean;
};

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  page: Page;
};

type PrinterSettings = {
  paperWidth: "58" | "80" | "A4";
  deviceName: string;
  model: string;
  connection: "system" | "usb" | "bluetooth" | "network";
};

type StocktakeSettings = {
  weekday: number;
  lastCompletedAt: string;
};

type BluetoothCapableNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: { acceptAllDevices: boolean; optionalServices?: string[] }) => Promise<{ name?: string }>;
  };
};

type UsbCapableNavigator = Navigator & {
  usb?: {
    requestDevice: (options: { filters: Array<Record<string, never>> }) => Promise<{ productName?: string; vendorId?: number; productId?: number }>;
  };
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageDataUrl?: string;
  quantity: number;
  lowStockAt: number;
  purchasePrice: number;
  salePrice: number;
  shelfLocation?: string;
  supplierName?: string;
  expiryDate?: string;
  batches?: ProductBatch[];
  quantityOffers?: QuantityOffer[];
};

type CartItem = Product & { cartQuantity: number };

type CustomerCategory = {
  id: string;
  name: string;
  discountPercent: number;
};

type LocalStaffMember = {
  id: string;
  name: string;
};

type Sale = {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number; cost: number }>;
  total: number;
  profit: number;
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  quantityOfferDiscountAmount?: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  customerCategoryId?: string;
  customerCategoryName?: string;
  staffMemberId?: string;
  staffMemberName?: string;
  isReturn?: boolean;
  returnOfSaleId?: string;
  returnReason?: string;
  note?: string;
  orderReference?: string;
};

type Debt = {
  id: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  paid: number;
  createdAt: string;
  dueDate: string;
  note: string;
};

type PriceHistoryEntry = {
  id: string;
  productId: string;
  productName: string;
  field: PriceChangeField;
  previous: number;
  next: number;
  createdAt: string;
};

type StoreData = {
  products: Product[];
  sales: Sale[];
  debts: Debt[];
  priceHistory: PriceHistoryEntry[];
  supplierPayments: SupplierPayment[];
  cashExpenses: CashExpense[];
  cashClosings: CashClosing[];
  debtCollections: DebtCollection[];
  customerCategories: CustomerCategory[];
  customerCreditLimits: Record<string, number>;
  localStaff: LocalStaffMember[];
  dailySalesGoals: Record<string, DailySalesGoal>;
  monthlySalesGoals: Record<string, MonthlySalesGoal>;
  stocktakeRecords: StocktakeRecord[];
  barcodeStocktakeDraft: BarcodeStocktakeDraft | null;
  dailyExpenseLimit: number;
  supplierDueDates: Record<string, string>;
  returnRateAlertThreshold: number;
  favoriteProductIds: string[];
  suspendedSaleDrafts: SuspendedSaleDraft[];
  storeName: string;
  storePhone: string;
  receiptLogo: string;
  defaultDiscountPercent: number;
  initialized: boolean;
};

const normalizeCashDenominations = (value: unknown): CashDenominationCount[] => Array.isArray(value)
  ? value.filter((entry): entry is CashDenominationCount => Boolean(entry && typeof entry === "object" && Number.isFinite((entry as { denomination?: unknown }).denomination) && Number((entry as { denomination?: number }).denomination) > 0 && Number.isFinite((entry as { count?: unknown }).count) && Number((entry as { count?: number }).count) > 0)).map((entry) => ({ denomination: Number(entry.denomination), count: Math.floor(Number(entry.count)) }))
  : [];

const STORAGE_KEY = "souqna-local-store-v1";
const NOTIFICATION_SETTINGS_KEY = "souqna-notification-settings-v1";
const NOTIFICATION_READ_KEY = "souqna-read-notifications-v1";
const PRINTER_SETTINGS_KEY = "souqna-printer-settings-v1";
const BACKUP_EXPORTED_AT_KEY = "souqna-backup-exported-at-v1";
const STOCKTAKE_SETTINGS_KEY = "souqna-stocktake-settings-v1";
const SUPPLIER_CREDIT_LIMITS_KEY = "souqna-supplier-credit-limits-v1";
const LOCAL_ACTION_LOCK_KEY = "souqna-local-action-lock-v1";
const LOCAL_STORE_RECORD_KEY = "active-store";
const logoUrl = "/manus-storage/souqna-logo_8eb5e872.png";
const ledgerTextureUrl = "/manus-storage/souqna-ledger-texture_5ff659ed.jpg";
const counterImageUrl = "/manus-storage/souqna-store-counter_0b8a8486.jpg";
const receiptPatternUrl = "/manus-storage/souqna-receipt-pattern_1ca66f66.jpg";

const emptyStoreData: StoreData = {
  products: [],
  sales: [],
  debts: [],
  priceHistory: [],
  supplierPayments: [],
  cashExpenses: [],
  cashClosings: [],
  debtCollections: [],
  customerCategories: [],
  customerCreditLimits: {},
  localStaff: [],
  dailySalesGoals: {},
  monthlySalesGoals: {},
  stocktakeRecords: [],
  barcodeStocktakeDraft: null,
  dailyExpenseLimit: 0,
  supplierDueDates: {},
  returnRateAlertThreshold: 10,
  favoriteProductIds: [],
  suspendedSaleDrafts: [],
  storeName: "محل جديد",
  storePhone: "",
  receiptLogo: "",
  defaultDiscountPercent: 0,
  initialized: false,
};

const demoProductIds = new Set(["water", "milk", "juice", "biscuits", "rice"]);

const navItems: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "لوحة اليوم", icon: LayoutDashboard },
  { id: "sale", label: "بيع جديد", icon: ShoppingBag },
  { id: "inventory", label: "المخزون", icon: Archive },
  { id: "debts", label: "دفتر الذمم", icon: WalletCards },
  { id: "reports", label: "التقارير", icon: BarChart3 },
];

const money = (value: number) => `${new Intl.NumberFormat("ar-LY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} د.ل`;
const compactMoney = (value: number) => new Intl.NumberFormat("ar-LY", { maximumFractionDigits: 0 }).format(value);
const todayKey = () => new Date().toISOString().slice(0, 10);
const isToday = (date: string) => date.slice(0, 10) === todayKey();
const isCurrentMonth = (date: string) => date.slice(0, 7) === new Date().toISOString().slice(0, 7);
const formatDate = (date: string) => new Intl.DateTimeFormat("ar-LY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character] ?? character));
const pickColumn = (row: Record<string, unknown>, keys: string[]) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== "");
const excelText = (value: unknown) => String(value ?? "").trim();
const excelNumber = (value: unknown) => Number(String(value ?? "").replace(",", ".").trim());

const readLocalActionLockSettings = (): LocalActionLockSettings => {
  try {
    const candidate = JSON.parse(localStorage.getItem(LOCAL_ACTION_LOCK_KEY) || "null") as Partial<LocalActionLockSettings> | null;
    return candidate && typeof candidate.enabled === "boolean" && typeof candidate.salt === "string" && typeof candidate.pinHash === "string" ? { enabled: candidate.enabled, salt: candidate.salt, pinHash: candidate.pinHash } : emptyLocalActionLockSettings;
  } catch {
    return emptyLocalActionLockSettings;
  }
};

function normalizeStore(input: Partial<StoreData> | null): StoreData {
  if (!input) return emptyStoreData;
  const realProducts = Array.isArray(input.products) ? input.products.filter((product) => !demoProductIds.has(product.id)).map((product) => ({ ...product, imageDataUrl: isLocalProductImage(product.imageDataUrl) ? product.imageDataUrl : undefined, supplierName: typeof product.supplierName === "string" ? product.supplierName.trim() : "", expiryDate: typeof product.expiryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(product.expiryDate) ? product.expiryDate : "", quantityOffers: Array.isArray(product.quantityOffers) ? product.quantityOffers.filter((offer): offer is QuantityOffer => Boolean(offer && Number.isFinite(offer.minimumQuantity) && Number(offer.minimumQuantity) >= 1 && Number.isFinite(offer.discountPercent) && Number(offer.discountPercent) > 0)).map((offer) => { const startDate = typeof offer.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(offer.startDate) ? offer.startDate : ""; const rawEndDate = typeof offer.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(offer.endDate) ? offer.endDate : ""; return { minimumQuantity: Math.max(1, Math.floor(Number(offer.minimumQuantity))), discountPercent: Math.min(100, Math.max(0, Number(offer.discountPercent))), startDate, endDate: rawEndDate && (!startDate || rawEndDate >= startDate) ? rawEndDate : "" }; }).sort((left, right) => left.minimumQuantity - right.minimumQuantity) : [], batches: Array.isArray(product.batches) ? product.batches.filter((batch): batch is ProductBatch => Boolean(batch && typeof batch.id === "string" && typeof batch.receivedAt === "string" && Number.isFinite(batch.quantity) && Number.isFinite(batch.remainingQuantity) && Number.isFinite(batch.purchasePrice) && typeof batch.expiryDate === "string" && typeof batch.supplierName === "string" && typeof batch.note === "string")).map((batch) => ({ ...batch, purchaseInvoiceRef: typeof batch.purchaseInvoiceRef === "string" ? batch.purchaseInvoiceRef.trim().slice(0, 100) : "", remainingQuantity: Math.max(0, batch.remainingQuantity) })) : [] })) : [];
  const realSales = Array.isArray(input.sales) ? input.sales
    .map((sale) => ({ ...sale, items: Array.isArray(sale.items) ? sale.items.filter((item) => !demoProductIds.has(item.productId)) : [] }))
    .filter((sale) => sale.items.length > 0) : [];
  return {
    products: realProducts,
    sales: realSales,
    debts: Array.isArray(input.debts) ? input.debts : [],
    priceHistory: Array.isArray(input.priceHistory) ? input.priceHistory.filter((entry): entry is PriceHistoryEntry => Boolean(entry && typeof entry.productId === "string" && typeof entry.productName === "string" && (entry.field === "purchasePrice" || entry.field === "salePrice") && Number.isFinite(entry.previous) && Number.isFinite(entry.next) && typeof entry.createdAt === "string")) : [],
    supplierPayments: Array.isArray(input.supplierPayments) ? input.supplierPayments.filter((payment): payment is SupplierPayment => Boolean(payment && typeof payment.id === "string" && typeof payment.supplierName === "string" && Number.isFinite(payment.amount) && payment.amount > 0 && typeof payment.paidAt === "string" && typeof payment.note === "string")) : [],
    cashExpenses: Array.isArray(input.cashExpenses) ? input.cashExpenses.filter((expense): expense is CashExpense => Boolean(expense && typeof expense.id === "string" && Number.isFinite(expense.amount) && expense.amount > 0 && typeof expense.category === "string" && typeof expense.note === "string" && typeof expense.spentAt === "string")) : [],
    cashClosings: Array.isArray(input.cashClosings) ? input.cashClosings.filter((closing): closing is CashClosing => Boolean(closing && typeof closing.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(closing.date) && Number.isFinite(closing.openingCash) && closing.openingCash >= 0 && Number.isFinite(closing.actualCash) && closing.actualCash >= 0 && typeof closing.note === "string" && typeof closing.closedAt === "string")).map((closing) => ({ ...closing, responsibleName: typeof closing.responsibleName === "string" ? closing.responsibleName.trim().slice(0, 80) : "", denominations: normalizeCashDenominations(closing.denominations) })) : [],
    debtCollections: Array.isArray(input.debtCollections) ? input.debtCollections.filter((collection): collection is DebtCollection => Boolean(collection && typeof collection.id === "string" && typeof collection.debtId === "string" && typeof collection.customerName === "string" && Number.isFinite(collection.amount) && collection.amount > 0 && typeof collection.collectedAt === "string" && typeof collection.note === "string")) : [],
    customerCategories: Array.isArray(input.customerCategories) ? input.customerCategories.filter((category): category is CustomerCategory => Boolean(category && typeof category.id === "string" && category.id.trim() && typeof category.name === "string" && category.name.trim() && Number.isFinite(category.discountPercent))).map((category) => ({ id: category.id, name: category.name.trim().slice(0, 60), discountPercent: Math.min(100, Math.max(0, Number(category.discountPercent))) })) : [],
    customerCreditLimits: normaliseCustomerCreditLimits(input.customerCreditLimits),
    localStaff: Array.isArray(input.localStaff) ? input.localStaff.filter((member): member is LocalStaffMember => Boolean(member && typeof member.id === "string" && member.id.trim() && typeof member.name === "string" && member.name.trim())).map((member) => ({ id: member.id, name: member.name.trim().slice(0, 60) })) : [],
    dailySalesGoals: Object.fromEntries(Object.entries(input.dailySalesGoals ?? {}).flatMap(([date, goal]) => {
      const candidate = goal as Partial<DailySalesGoal>;
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(candidate?.target) && Number(candidate.target) > 0 && typeof candidate.setAt === "string" ? [[date, { date, target: Number(candidate.target), setAt: candidate.setAt }]] : [];
    })),
    monthlySalesGoals: Object.fromEntries(Object.entries(input.monthlySalesGoals ?? {}).flatMap(([month, goal]) => {
      const candidate = goal as Partial<MonthlySalesGoal>;
      return /^\d{4}-\d{2}$/.test(month) && Number.isFinite(candidate?.target) && Number(candidate.target) > 0 && typeof candidate.setAt === "string" ? [[month, { month, target: Number(candidate.target), setAt: candidate.setAt }]] : [];
    })),
    stocktakeRecords: Array.isArray(input.stocktakeRecords) ? input.stocktakeRecords.filter((record): record is StocktakeRecord => Boolean(record && typeof record.id === "string" && typeof record.productId === "string" && typeof record.productName === "string" && typeof record.sku === "string" && Number.isFinite(record.recordedQuantity) && Number.isFinite(record.actualQuantity) && Number.isFinite(record.difference) && Number.isFinite(record.valueDifference) && typeof record.recordedAt === "string" && typeof record.note === "string")) : [],
    barcodeStocktakeDraft: input.barcodeStocktakeDraft && typeof input.barcodeStocktakeDraft === "object" && typeof input.barcodeStocktakeDraft.id === "string" && typeof input.barcodeStocktakeDraft.createdAt === "string" && typeof input.barcodeStocktakeDraft.updatedAt === "string" && typeof input.barcodeStocktakeDraft.note === "string" ? {
      id: input.barcodeStocktakeDraft.id,
      createdAt: input.barcodeStocktakeDraft.createdAt,
      updatedAt: input.barcodeStocktakeDraft.updatedAt,
      note: input.barcodeStocktakeDraft.note.trim().slice(0, 160) || "جرد سريع بالباركود",
      counts: normaliseBarcodeStocktakeCounts(input.barcodeStocktakeDraft.counts, realProducts.map((product) => product.id)),
    } : null,
    dailyExpenseLimit: Math.max(0, Number(input.dailyExpenseLimit) || 0),
    supplierDueDates: Object.fromEntries(Object.entries(input.supplierDueDates ?? {}).filter(([supplierName, dueDate]) => Boolean(supplierName.trim() && typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)))),
    returnRateAlertThreshold: Math.min(100, Math.max(1, Number(input.returnRateAlertThreshold) || 10)),
    favoriteProductIds: normaliseFavoriteProductIds(input.favoriteProductIds, realProducts),
    suspendedSaleDrafts: normaliseSuspendedSaleDrafts(input.suspendedSaleDrafts),
    storeName: input.storeName && input.storeName !== "بقالة الحي" ? input.storeName : emptyStoreData.storeName,
    storePhone: typeof input.storePhone === "string" ? input.storePhone : "",
    receiptLogo: isReceiptLogoDataUrl(input.receiptLogo) ? input.receiptLogo : "",
    defaultDiscountPercent: Math.min(100, Math.max(0, Number(input.defaultDiscountPercent) || 0)),
    initialized: Boolean(input.initialized && input.storeName && input.storeName !== "بقالة الحي"),
  };
}

function readLegacyStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeStore(raw ? JSON.parse(raw) as Partial<StoreData> : null);
  } catch {
    return emptyStoreData;
  }
}

function readNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return { stock: true, debts: true, backup: true, cash: true, goals: true, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { stock: true, debts: true, backup: true, cash: true, goals: true };
  }
}

function readNotificationIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_READ_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function readPrinterSettings(): PrinterSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRINTER_SETTINGS_KEY) || "{}");
    return {
      paperWidth: parsed.paperWidth === "80" || parsed.paperWidth === "A4" ? parsed.paperWidth : "58",
      deviceName: typeof parsed.deviceName === "string" ? parsed.deviceName : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      connection: ["system", "usb", "bluetooth", "network"].includes(parsed.connection) ? parsed.connection : "system",
    };
  } catch {
    return { paperWidth: "58", deviceName: "", model: "", connection: "system" };
  }
}

function readStocktakeSettings(): StocktakeSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STOCKTAKE_SETTINGS_KEY) || "{}");
    return {
      weekday: Number.isInteger(parsed.weekday) && parsed.weekday >= 0 && parsed.weekday <= 6 ? parsed.weekday : 0,
      lastCompletedAt: typeof parsed.lastCompletedAt === "string" ? parsed.lastCompletedAt : "",
    };
  } catch {
    return { weekday: 0, lastCompletedAt: "" };
  }
}

function readSupplierCreditLimits(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUPPLIER_CREDIT_LIMITS_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).flatMap(([supplier, limit]) => typeof supplier === "string" && Number.isFinite(limit) && Number(limit) >= 0 ? [[supplier, Number(limit)]] : []));
  } catch {
    return {};
  }
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof CircleDollarSign; tone: "olive" | "apricot" | "blue" | "sand" }) {
  return (
    <section className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__icon"><Icon size={22} strokeWidth={2.1} /></div>
      <div>
        <p>{label}</p>
        <strong dir="ltr">{value}</strong>
        <small>{detail}</small>
      </div>
    </section>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Archive; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span><Icon size={28} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export default function Home() {
  const [store, setStore] = useState<StoreData>(emptyStoreData);
  const [dataReady, setDataReady] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingProductImage, setPendingProductImage] = useState("");
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showSettledDebts, setShowSettledDebts] = useState(false);
  const [collectionDebt, setCollectionDebt] = useState<Debt | null>(null);
  const [customerStatementName, setCustomerStatementName] = useState("");
  const [collectionAmount, setCollectionAmount] = useState("");
  const [priceHistoryProductId, setPriceHistoryProductId] = useState<string | null>(null);
  const [showStoreSetup, setShowStoreSetup] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showStocktakeScanner, setShowStocktakeScanner] = useState(false);
  const [showBarcodeStocktake, setShowBarcodeStocktake] = useState(false);
  const [showBarcodeStocktakeScanner, setShowBarcodeStocktakeScanner] = useState(false);
  const [externalBarcodeReaderActive, setExternalBarcodeReaderActive] = useState(false);
  const [barcodeStocktakeQuery, setBarcodeStocktakeQuery] = useState("");
  const [barcodeStocktakeOnlyPending, setBarcodeStocktakeOnlyPending] = useState(false);
  const [barcodeStocktakeShelfFilter, setBarcodeStocktakeShelfFilter] = useState("");
  const [stocktakeProduct, setStocktakeProduct] = useState<Product | null>(null);
  const [stocktakeQuantity, setStocktakeQuantity] = useState("");
  const [showBulkStocktake, setShowBulkStocktake] = useState(false);
  const [actionLockSettings, setActionLockSettings] = useState<LocalActionLockSettings>(readLocalActionLockSettings);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<{ title: string; action: () => void } | null>(null);
  const [actionLockPin, setActionLockPin] = useState("");
  const [bulkStocktakeQuantities, setBulkStocktakeQuantities] = useState<Record<string, string>>({});
  const [receivingProduct, setReceivingProduct] = useState<Product | null>(null);
  const [editingBatch, setEditingBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [wasteApprovalBatch, setWasteApprovalBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [finalWasteApprovalBatch, setFinalWasteApprovalBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [supplierReturnBatch, setSupplierReturnBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [supplierPaymentSupplier, setSupplierPaymentSupplier] = useState<string | null>(null);
  const [showCashExpenseForm, setShowCashExpenseForm] = useState(false);
  const [showCashClosingForm, setShowCashClosingForm] = useState(false);
  const [showDailyGoalForm, setShowDailyGoalForm] = useState(false);
  const [showMonthlyGoalForm, setShowMonthlyGoalForm] = useState(false);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [returnCartSale, setReturnCartSale] = useState<Sale | null>(null);
  const [returnCartReason, setReturnCartReason] = useState("");
  const [showReturnReasonPicker, setShowReturnReasonPicker] = useState(false);
  const [returnInvoiceQuery, setReturnInvoiceQuery] = useState("");
  const [returnFilterFromDate, setReturnFilterFromDate] = useState("");
  const [returnFilterToDate, setReturnFilterToDate] = useState("");
  const [returnReasonFilter, setReturnReasonFilter] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [cashDenominationCounts, setCashDenominationCounts] = useState<Record<number, string>>({});
  const [supplierPurchasesMonth, setSupplierPurchasesMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [supplierCreditLimits, setSupplierCreditLimits] = useState<Record<string, number>>(readSupplierCreditLimits);
  const [stocktakeSettings, setStocktakeSettings] = useState<StocktakeSettings>(readStocktakeSettings);
  const [showShelfLabels, setShowShelfLabels] = useState(false);
  const [selectedLabelProductIds, setSelectedLabelProductIds] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState<LabelSize>("standard");
  const [pendingBarcode, setPendingBarcode] = useState("");
  const [inventoryShelfFilter, setInventoryShelfFilter] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerCategoryId, setSelectedCustomerCategoryId] = useState("");
  const [selectedStaffMemberId, setSelectedStaffMemberId] = useState("");
  const [saleDiscountPercent, setSaleDiscountPercent] = useState("0");
  const [saleNote, setSaleNote] = useState("");
  const [saleOrderReference, setSaleOrderReference] = useState("");
  const [saleCategoryFilter, setSaleCategoryFilter] = useState("");
  const [suspendedSaleLabel, setSuspendedSaleLabel] = useState("");
  const [debtQuery, setDebtQuery] = useState("");
  const [latestSale, setLatestSale] = useState<Sale | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(readNotificationPreferences);
  const [readNotificationKeys, setReadNotificationKeys] = useState<string[]>(readNotificationIds);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(readPrinterSettings);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string>(() => localStorage.getItem(BACKUP_EXPORTED_AT_KEY) ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const saleSearchInputRef = useRef<HTMLInputElement>(null);
  const externalBarcodeBufferRef = useRef<ExternalBarcodeBuffer>({ value: "", lastKeyAt: 0 });

  useEffect(() => {
    let active = true;
    const loadStore = async () => {
      const stored = await readLocalRecord<Partial<StoreData>>(LOCAL_STORE_RECORD_KEY);
      const nextStore = normalizeStore(stored ?? readLegacyStore());
      if (!active) return;
      setStore(nextStore);
      setDataReady(true);
      setShowStoreSetup(!nextStore.initialized);
    };
    void loadStore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    void writeLocalRecord(LOCAL_STORE_RECORD_KEY, store);
  }, [dataReady, store]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notificationPreferences));
  }, [notificationPreferences]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(readNotificationKeys));
  }, [readNotificationKeys]);

  useEffect(() => {
    localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(printerSettings));
  }, [printerSettings]);

  useEffect(() => {
    localStorage.setItem(STOCKTAKE_SETTINGS_KEY, JSON.stringify(stocktakeSettings));
  }, [stocktakeSettings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_ACTION_LOCK_KEY, JSON.stringify(actionLockSettings));
  }, [actionLockSettings]);

  useEffect(() => {
    const syncConnection = () => setIsOnline(navigator.onLine);
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  const todaySales = useMemo(() => store.sales.filter((sale) => isToday(sale.createdAt)), [store.sales]);
  const monthSales = useMemo(() => store.sales.filter((sale) => isCurrentMonth(sale.createdAt)), [store.sales]);
  const weeklySummary = useMemo(() => getWeeklySummary(store.sales), [store.sales]);
  const weekComparison = useMemo(() => getWeekComparison(store.sales), [store.sales]);
  const monthlySummary = useMemo(() => getMonthlyReport(store.sales), [store.sales]);
  const stocktakeDue = useMemo(() => isWeeklyStocktakeDue(stocktakeSettings), [stocktakeSettings]);
  const salesTodayTotal = useMemo(() => todaySales.reduce((total, sale) => total + sale.total, 0), [todaySales]);
  const dailyGoalProgress = useMemo(() => getDailyGoalProgress(store.dailySalesGoals[todayKey()], salesTodayTotal), [salesTodayTotal, store.dailySalesGoals]);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthlyGoalProgress = useMemo(() => getMonthlyGoalProgress(store.monthlySalesGoals[currentMonthKey], monthlySummary.revenue), [currentMonthKey, monthlySummary.revenue, store.monthlySalesGoals]);
  const profitToday = useMemo(() => todaySales.reduce((total, sale) => total + sale.profit, 0), [todaySales]);
  const todayCashClosing = useMemo(() => getCashClosingForDate(store.cashClosings, todayKey()), [store.cashClosings]);
  const countedCashEntries = useMemo(() => getActiveCashDenominations(CASH_DENOMINATIONS.map((denomination) => ({ denomination, count: Number(cashDenominationCounts[denomination]) || 0 }))), [cashDenominationCounts]);
  const countedCashTotal = useMemo(() => getCashDenominationTotal(countedCashEntries), [countedCashEntries]);
  const todayCashSummary = useMemo(() => getDailyCashSummary(store.sales, store.cashExpenses, todayKey(), todayCashClosing?.openingCash ?? 0, todayCashClosing?.actualCash, store.debtCollections), [store.cashClosings, store.cashExpenses, store.debtCollections, store.sales, todayCashClosing]);
  const todayExpenses = useMemo(() => store.cashExpenses.filter((expense) => isToday(expense.spentAt)).sort((left, right) => right.spentAt.localeCompare(left.spentAt)), [store.cashExpenses]);
  const todayExpenseLimitStatus = useMemo(() => getDailyExpenseLimitStatus(store.cashExpenses, todayKey(), store.dailyExpenseLimit), [store.cashExpenses, store.dailyExpenseLimit]);
  const monthlyExpenseReport = useMemo(() => getMonthlyExpenseReport(store.cashExpenses, new Date().toISOString().slice(0, 7)), [store.cashExpenses]);
  const todayDebtCollections = useMemo(() => store.debtCollections.filter((collection) => isToday(collection.collectedAt)).sort((left, right) => right.collectedAt.localeCompare(left.collectedAt)), [store.debtCollections]);
  const totalOutstanding = useMemo(() => store.debts.reduce((total, debt) => total + Math.max(0, debt.amount - debt.paid), 0), [store.debts]);
  const filteredDebts = useMemo(() => {
    const nameQuery = debtQuery.trim().toLocaleLowerCase("ar");
    const phoneQuery = debtQuery.replace(/\s+/g, "");
    if (!nameQuery && !phoneQuery) return store.debts;
    return store.debts.filter((debt) => debt.customerName.toLocaleLowerCase("ar").includes(nameQuery) || (debt.customerPhone || "").replace(/\s+/g, "").includes(phoneQuery));
  }, [debtQuery, store.debts]);
  const activeDebts = useMemo(() => filteredDebts.filter((debt) => !isSettledDebt(debt)), [filteredDebts]);
  const settledDebts = useMemo(() => filteredDebts.filter(isSettledDebt), [filteredDebts]);
  const selectedProductPriceHistory = useMemo(() => priceHistoryProductId ? store.priceHistory.filter((entry) => entry.productId === priceHistoryProductId) : [], [priceHistoryProductId, store.priceHistory]);
  const lowStock = useMemo(() => store.products.filter((product) => product.quantity <= product.lowStockAt), [store.products]);
  const nearDepletion = useMemo(() => getNearDepletionProducts(store.products), [store.products]);
  const inactiveProducts = useMemo(() => getInactiveProducts(store.products, store.sales), [store.products, store.sales]);
  const expiringProducts = useMemo(() => getExpiringProducts(store.products), [store.products]);
  const supplierPurchaseList = useMemo(() => getSupplierPurchaseList(store.products), [store.products]);
  const expirySortedBatches = useMemo(() => getExpirySortedBatchInventory(store.products), [store.products]);
  const batchHistory = useMemo(() => getBatchHistory(store.products), [store.products]);
  const expiryWasteReport = useMemo(() => getExpiryWasteReport(store.products), [store.products]);
  const supplierInventoryCostReport = useMemo(() => getSupplierInventoryCostReport(store.products), [store.products]);
  const supplierCreditStatus = useMemo(() => getSupplierCreditStatus(store.products, store.supplierPayments, supplierCreditLimits), [store.products, store.supplierPayments, supplierCreditLimits]);
  const supplierDueDateStatuses = useMemo(() => getSupplierDueDateStatuses(supplierCreditStatus.groups, store.supplierDueDates, todayKey()), [store.supplierDueDates, supplierCreditStatus.groups]);
  const supplierOperatingSummary = useMemo(() => {
    const inventoryBySupplier = new Map(supplierInventoryCostReport.groups.map((group) => [group.supplierName, group.cost]));
    const monthPaymentsBySupplier = new Map<string, number>();
    store.supplierPayments.filter((payment) => isCurrentMonth(payment.paidAt)).forEach((payment) => monthPaymentsBySupplier.set(payment.supplierName, (monthPaymentsBySupplier.get(payment.supplierName) ?? 0) + payment.amount));
    return supplierCreditStatus.groups.map((group) => ({ supplierName: group.supplierName, outstanding: group.outstanding, inventoryCost: inventoryBySupplier.get(group.supplierName) ?? 0, monthlyPayments: monthPaymentsBySupplier.get(group.supplierName) ?? 0 }));
  }, [store.supplierPayments, supplierCreditStatus.groups, supplierInventoryCostReport.groups]);
  const supplierPurchaseReport = useMemo(() => {
    const [year, month] = supplierPurchasesMonth.split("-").map(Number);
    const lastDay = Number.isFinite(year) && Number.isFinite(month) ? new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) : todayKey();
    return getSupplierPurchaseReport(store.products, `${supplierPurchasesMonth}-01`, lastDay);
  }, [store.products, supplierPurchasesMonth]);
  const supplierPurchaseComparison = useMemo(() => getSupplierPurchaseComparison(store.products, supplierPurchasesMonth), [store.products, supplierPurchasesMonth]);
  const supplierObligationReport = useMemo(() => getSupplierObligationReport(supplierCreditStatus.groups, supplierDueDateStatuses), [supplierCreditStatus.groups, supplierDueDateStatuses]);
  const operationalInsights = useMemo(() => getProductDemandInsights(store.products, store.sales), [store.products, store.sales]);
  const purchaseRecommendations = useMemo(() => getPurchaseRecommendations(operationalInsights), [operationalInsights]);
  const cashFlowForecast = useMemo(() => getCashFlowForecast(store.sales, store.cashExpenses, store.debtCollections), [store.cashExpenses, store.debtCollections, store.sales]);
  const operationalRiskInsights = useMemo(() => operationalInsights.filter((entry) => entry.risk === "urgent" || entry.risk === "watch"), [operationalInsights]);
  const stocktakeRecordSummary = useMemo(() => getStocktakeRecordSummary(store.stocktakeRecords), [store.stocktakeRecords]);
  const recentStocktakeRecords = useMemo(() => [...store.stocktakeRecords].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt)).slice(0, 8), [store.stocktakeRecords]);
  const barcodeStocktakeProgress = useMemo(() => getBarcodeStocktakeProgress(store.products, store.barcodeStocktakeDraft?.counts ?? {}), [store.barcodeStocktakeDraft?.counts, store.products]);
  const filteredBarcodeStocktakeEntries = useMemo(() => {
    const needle = barcodeStocktakeQuery.trim().toLocaleLowerCase("ar");
    return barcodeStocktakeProgress.entries.filter((entry) => (!barcodeStocktakeOnlyPending || !entry.counted) && (!barcodeStocktakeShelfFilter || (entry.shelfLocation || "").trim() === barcodeStocktakeShelfFilter) && (!needle || `${entry.name} ${entry.sku} ${entry.category} ${entry.shelfLocation || ""}`.toLocaleLowerCase("ar").includes(needle))).sort((left, right) => (left.shelfLocation || "~").localeCompare(right.shelfLocation || "~", "ar") || left.name.localeCompare(right.name, "ar"));
  }, [barcodeStocktakeOnlyPending, barcodeStocktakeProgress.entries, barcodeStocktakeQuery, barcodeStocktakeShelfFilter]);
  const shelfLocations = useMemo(() => Array.from(new Set(store.products.map((product) => product.shelfLocation?.trim()).filter((location): location is string => Boolean(location)))).sort((left, right) => left.localeCompare(right, "ar")), [store.products]);
  const stocktakeRunComparison = useMemo(() => getStocktakeRunComparison(store.stocktakeRecords), [store.stocktakeRecords]);
  const saleReturns = useMemo(() => store.sales.filter((sale) => sale.isReturn), [store.sales]);
  const returnReasons = useMemo(() => getReturnReasons(store.sales), [store.sales]);
  const filteredSaleReturns = useMemo(() => filterReturnSales(store.sales, { fromDate: returnFilterFromDate, toDate: returnFilterToDate, reason: returnReasonFilter }), [returnFilterFromDate, returnFilterToDate, returnReasonFilter, store.sales]);
  const recentReturnableSales = useMemo(() => store.sales.filter((sale) => !sale.isReturn && sale.total > 0).slice(0, 8), [store.sales]);
  const filteredReturnableSales = useMemo(() => searchReturnableSales(store.sales, returnInvoiceQuery).slice(0, 20), [returnInvoiceQuery, store.sales]);
  const returnCartAvailableItems = useMemo(() => returnCartSale ? getSaleReturnableItems(returnCartSale, store.sales) : [], [returnCartSale, store.sales]);
  const returnCartItems = useMemo(() => {
    if (!returnCartSale) return [];
    const availableByProductId = new Map(returnCartAvailableItems.map((item) => [item.productId, item.remainingQuantity]));
    return returnCartSale.items.flatMap((item) => {
      const quantity = Math.min(availableByProductId.get(item.productId) ?? 0, Math.max(0, Math.floor(Number(returnQuantities[item.productId]) || 0)));
      return quantity > 0 ? [{ ...item, quantity }] : [];
    });
  }, [returnCartAvailableItems, returnCartSale, returnQuantities]);
  const returnCartTotal = useMemo(() => returnCartSale ? getReturnCartTotal(returnCartSale, returnCartItems) : 0, [returnCartItems, returnCartSale]);
  const recurringCustomers = useMemo(() => getRecurringCustomers(store.sales, store.debts), [store.sales, store.debts]);
  const productProfitabilityReport = useMemo(() => getProductProfitability(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const highReturnRateProducts = useMemo(() => getHighReturnRateProducts(productProfitabilityReport.entries, store.returnRateAlertThreshold), [productProfitabilityReport.entries, store.returnRateAlertThreshold]);
  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    if (notificationPreferences.stock) {
      nearDepletion.forEach((product) => {
        items.push({
          id: `near-stock-${product.id}-${product.quantity}`,
          kind: "info",
          title: `قارب «${product.name}» على حد التنبيه`,
          description: `المتوفر ${product.quantity} وحدات؛ جهّز إعادة الطلب قبل أن ينخفض عن الحد ${product.lowStockAt}.`,
          page: "inventory",
        });
      });
      lowStock.forEach((product) => {
        const exhausted = product.quantity === 0;
        items.push({
          id: `stock-${product.id}-${product.quantity}`,
          kind: exhausted ? "critical" : "warning",
          title: exhausted ? `نفد صنف «${product.name}»` : `مخزون منخفض: ${product.name}`,
          description: exhausted ? "لا توجد أي وحدات متاحة للبيع الآن." : `المتوفر ${product.quantity} وحدات، وحد التنبيه ${product.lowStockAt}.`,
          page: "inventory",
        });
      });
      inactiveProducts.forEach(({ product, lastSoldAt }) => {
        items.push({
          id: `inactive-product-${product.id}-${lastSoldAt || "never"}`,
          kind: "info",
          title: `صنف بلا حركة: ${product.name}`,
          description: lastSoldAt ? `لم يسجل بيع للصنف خلال آخر 30 يومًا. آخر بيع: ${formatDate(lastSoldAt)}.` : "لم يسجل لهذا الصنف أي بيع بعد.",
          page: "inventory",
        });
      });
      expiringProducts.forEach(({ product, status }) => {
        const expired = status.kind === "expired";
        items.push({
          id: `expiry-${product.id}-${product.expiryDate}`,
          kind: expired ? "critical" : "warning",
          title: expired ? `انتهت صلاحية «${product.name}»` : `صلاحية قريبة: ${product.name}`,
          description: expired ? `تاريخ الصلاحية ${product.expiryDate}. أوقف بيع الصنف وراجعه.` : `تنتهي الصلاحية في ${product.expiryDate} بعد ${status.daysRemaining ?? 0} يوم.`,
          page: "inventory",
        });
      });
      highReturnRateProducts.forEach((entry) => {
        items.push({
          id: `high-return-rate-${currentMonthKey}-${entry.productId}-${entry.returnRatePercent.toFixed(1)}`,
          kind: "warning",
          title: `نسبة إرجاع مرتفعة: ${entry.productName}`,
          description: `أُرجع ${entry.returnedUnits} من ${entry.soldUnits} وحدات مباعة هذا الشهر (${entry.returnRatePercent.toFixed(1)}%). راجع سبب الإرجاع والصنف.`,
          page: "reports",
        });
      });
    }
    if (notificationPreferences.stock) {
      supplierCreditStatus.groups.filter((group) => group.exceeded || group.nearing).forEach((group) => {
        items.push({
          id: `supplier-credit-${group.supplierName}-${group.outstanding}-${group.creditLimit}`,
          kind: group.exceeded ? "critical" : "warning",
          title: group.exceeded ? `تجاوز ائتمان المورد: ${group.supplierName}` : `اقتربت من سقف ائتمان ${group.supplierName}`,
          description: `الرصيد المستحق ${money(group.outstanding)} من سقف ${money(group.creditLimit)}${group.exceeded ? "؛ راجع دفعة للمورد." : "؛ جهّز دفعة قبل التجاوز."}`,
          page: "reports",
        });
      });
      supplierDueDateStatuses.filter((status) => status.overdue || status.nearing).forEach((status) => {
        items.push({
          id: `supplier-due-${status.supplierName}-${status.dueDate}-${status.outstanding}`,
          kind: status.overdue ? "critical" : "warning",
          title: status.overdue ? `استحقاق مورد متأخر: ${status.supplierName}` : `استحقاق مورد قريب: ${status.supplierName}`,
          description: status.overdue ? `تأخر استحقاق ${money(status.outstanding)} منذ ${Math.abs(status.daysUntilDue)} يوم. راجع دفعة المورد.` : `يستحق ${money(status.outstanding)} في ${status.dueDate} بعد ${status.daysUntilDue} ${status.daysUntilDue === 1 ? "يوم" : "أيام"}.`,
          page: "reports",
        });
      });
    }
    if (notificationPreferences.debts) {
      store.debts.filter((debt) => debt.amount > debt.paid).forEach((debt) => {
        const overdue = Boolean(debt.dueDate && debt.dueDate <= todayKey());
        items.push({
          id: `debt-${debt.id}-${debt.paid}`,
          kind: overdue ? "critical" : "info",
          title: overdue ? `ذمة مستحقة من ${debt.customerName}` : `ذمة تحتاج متابعة: ${debt.customerName}`,
          description: `${overdue ? "تجاوزت" : "المتبقي لدى الزبون"} ${money(Math.max(0, debt.amount - debt.paid))}${debt.dueDate ? ` · استحقاق ${debt.dueDate}` : ""}`,
          page: "debts",
        });
      });
    }
    if (notificationPreferences.cash && todayExpenseLimitStatus.active && (todayExpenseLimitStatus.nearing || todayExpenseLimitStatus.exceeded)) {
      items.push({
        id: `expense-limit-${todayKey()}-${todayExpenseLimitStatus.spent}-${todayExpenseLimitStatus.limit}`,
        kind: todayExpenseLimitStatus.exceeded ? "critical" : "warning",
        title: todayExpenseLimitStatus.exceeded ? "تجاوزت سقف مصروفات اليوم" : "اقتربت من سقف مصروفات اليوم",
        description: `سُجل ${money(todayExpenseLimitStatus.spent)} من سقف ${money(todayExpenseLimitStatus.limit)}${todayExpenseLimitStatus.exceeded ? "؛ راجع المصروفات قبل إغلاق الوردية." : `؛ المتبقي ${money(todayExpenseLimitStatus.remaining)}.`}`,
        page: "reports",
      });
    }
    if (notificationPreferences.goals && dailyGoalProgress.met) {
      items.push({
        id: `sales-goal-${todayKey()}-${dailyGoalProgress.target}`,
        kind: "info",
        title: "تم تحقيق هدف مبيعات اليوم",
        description: `المبيعات ${money(dailyGoalProgress.revenue)} بلغت أو تجاوزت هدف ${money(dailyGoalProgress.target)}.`,
        page: "dashboard",
      });
    }
    if (notificationPreferences.goals && monthlyGoalProgress.met) {
      items.push({
        id: `monthly-sales-goal-${currentMonthKey}-${monthlyGoalProgress.target}`,
        kind: "info",
        title: "تم تحقيق هدف مبيعات الشهر",
        description: `مبيعات الشهر ${money(monthlyGoalProgress.revenue)} بلغت أو تجاوزت هدف ${money(monthlyGoalProgress.target)}.`,
        page: "dashboard",
      });
    }
    if (notificationPreferences.backup && isBackupDueToday(lastBackupAt)) {
      items.push({
        id: `backup-${todayKey()}`,
        kind: "warning",
        title: "صدّر نسخة احتياطية اليوم",
        description: "احتفظ بنسخة من مبيعاتك ومخزونك وذممك قبل نهاية يوم العمل.",
        page: "settings",
      });
    }
    const priority: Record<NotificationKind, number> = { critical: 0, warning: 1, info: 2 };
    return items.sort((a, b) => priority[a.kind] - priority[b.kind]);
  }, [currentMonthKey, dailyGoalProgress, expiringProducts, highReturnRateProducts, inactiveProducts, lastBackupAt, lowStock, monthlyGoalProgress, nearDepletion, notificationPreferences, store.debts, supplierCreditStatus, supplierDueDateStatuses, todayExpenseLimitStatus]);
  const unreadNotificationCount = useMemo(() => notifications.filter((notification) => !readNotificationKeys.includes(notification.id)).length, [notifications, readNotificationKeys]);
  const selectedCustomerCategory = useMemo(() => store.customerCategories.find((category) => category.id === selectedCustomerCategoryId), [selectedCustomerCategoryId, store.customerCategories]);
  const selectedStaffMember = useMemo(() => store.localStaff.find((member) => member.id === selectedStaffMemberId), [selectedStaffMemberId, store.localStaff]);
  const activeSaleDiscountPercent = Math.min(100, Math.max(0, Number(saleDiscountPercent) || 0));
  const quantityOfferSummary = useMemo(() => getCartQuantityOfferSummary(cart.map((item) => ({ id: item.id, name: item.name, salePrice: item.salePrice, cartQuantity: item.cartQuantity, quantityOffers: item.quantityOffers }))), [cart]);
  const cartGrossSubtotal = cart.reduce((total, item) => total + item.salePrice * item.cartQuantity, 0);
  const saleTotals = useMemo(() => calculateSaleTotals(
    Math.max(0, cartGrossSubtotal - quantityOfferSummary.discountAmount),
    cart.reduce((total, item) => total + item.purchasePrice * item.cartQuantity, 0),
    activeSaleDiscountPercent,
  ), [activeSaleDiscountPercent, cart, cartGrossSubtotal, quantityOfferSummary.discountAmount]);
  const { discountPercent: cartDiscountPercent, discountAmount: manualCartDiscountAmount, total: cartTotal, profit: cartProfit } = saleTotals;
  const cartSubtotal = cartGrossSubtotal;
  const cartDiscountAmount = quantityOfferSummary.discountAmount + manualCartDiscountAmount;
  const customerCreditStatus = useMemo(() => customerName.trim() ? getCustomerCreditStatus(customerName, store.customerCreditLimits, store.debts, paymentMethod === "credit" ? cartTotal : 0) : { outstanding: 0, pendingCredit: 0, projected: 0, limit: null, ratio: 0, blocked: false, warning: false }, [cartTotal, customerName, paymentMethod, store.customerCreditLimits, store.debts]);
  const filteredSaleProducts = useMemo(() => {
    return filterQuickSaleProducts(store.products.filter((product) => product.quantity > 0 && getExpiryStatus(product.expiryDate).kind !== "expired"), query, saleCategoryFilter);
  }, [store.products, query, saleCategoryFilter]);
  const saleCategories = useMemo(() => getQuickSaleCategories(store.products), [store.products]);
  const favoriteSaleProducts = useMemo(() => store.favoriteProductIds.map((id) => store.products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product && product.quantity > 0 && getExpiryStatus(product.expiryDate).kind !== "expired")), [store.favoriteProductIds, store.products]);
  const filteredInventory = useMemo(() => store.products.filter((product) => (product.name.includes(inventoryQuery.trim()) || product.sku.includes(inventoryQuery.trim()) || (product.shelfLocation || "").includes(inventoryQuery.trim())) && (!inventoryShelfFilter || product.shelfLocation === inventoryShelfFilter)).sort((left, right) => (left.shelfLocation || "~").localeCompare(right.shelfLocation || "~", "ar") || left.name.localeCompare(right.name, "ar")), [store.products, inventoryQuery, inventoryShelfFilter]);
  const itemSales = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    monthSales.forEach((sale) => sale.items.forEach((item) => {
      const existing = map.get(item.productId) ?? { name: item.name, quantity: 0, revenue: 0 };
      map.set(item.productId, { name: item.name, quantity: existing.quantity + item.quantity, revenue: existing.revenue + item.quantity * item.price });
    }));
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [monthSales]);
  const returnReasonSummary = useMemo(() => getReturnReasonSummary(store.sales), [store.sales]);
  const monthlyReturnComparison = useMemo(() => getMonthlyReturnComparison(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const staffSalesReport = useMemo(() => getStaffSalesReport(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const staffReturnsReport = useMemo(() => getStaffReturnsReport(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const inventoryCategorySummary = useMemo(() => getInventoryCategorySummary(store.products), [store.products]);
  const customerStatementNames = useMemo(() => Array.from(new Set([...store.sales.filter((sale) => sale.paymentMethod === "credit" && sale.customerName).map((sale) => sale.customerName as string), ...store.debtCollections.map((collection) => collection.customerName)])), [store.debtCollections, store.sales]);
  const customerStatement = useMemo(() => customerStatementName ? getCustomerStatement(customerStatementName, store.sales, store.debtCollections) : null, [customerStatementName, store.debtCollections, store.sales]);

  const setActivePage = (next: Page) => {
    setPage(next);
    setMobileNav(false);
  };

  const openSale = () => {
    if (!store.products.length) {
      setShowProductForm(true);
      toast.info("أضف أول صنف حقيقي من مخزون محلك قبل بدء البيع.");
      return;
    }
    setSelectedCustomerCategoryId("");
    setSelectedStaffMemberId("");
    setSaleDiscountPercent(String(store.defaultDiscountPercent));
    setActivePage("sale");
  };

  const markNotificationRead = (id: string) => {
    setReadNotificationKeys((current) => current.includes(id) ? current : [...current, id]);
  };

  const openNotification = (notification: NotificationItem) => {
    markNotificationRead(notification.id);
    setActivePage(notification.page);
    setNotificationsOpen(false);
  };

  const markAllNotificationsRead = () => {
    setReadNotificationKeys((current) => Array.from(new Set([...current, ...notifications.map((notification) => notification.id)])));
    toast.success("تم تعليم كل الإشعارات كمقروءة.");
  };

  const addToCart = (product: Product) => {
    if (getExpiryStatus(product.expiryDate).kind === "expired") {
      toast.error(`لا يمكن بيع «${product.name}» لأن تاريخ صلاحيته منتهٍ.`);
      return;
    }
    setCart((current) => {
      const currentItem = current.find((item) => item.id === product.id);
      if (currentItem) {
        if (currentItem.cartQuantity >= product.quantity) {
          toast.error("لا تتوفر كمية إضافية من هذا الصنف.");
          return current;
        }
        return current.map((item) => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...current, { ...product, cartQuantity: 1 }];
    });
  };

  const toggleFavoriteProduct = (productId: string) => {
    setStore((current) => ({ ...current, favoriteProductIds: current.favoriteProductIds.includes(productId) ? current.favoriteProductIds.filter((id) => id !== productId) : [productId, ...current.favoriteProductIds] }));
  };

  const resetSaleDraft = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedCustomerCategoryId("");
    setSelectedStaffMemberId("");
    setSaleDiscountPercent(String(store.defaultDiscountPercent));
    setSaleNote("");
    setSaleOrderReference("");
    setPaymentMethod("cash");
  };

  const suspendCurrentSale = () => {
    if (!cart.length) {
      toast.error("أضف صنفًا واحدًا على الأقل قبل تعليق السلة.");
      return;
    }
    const draft = createSuspendedSaleDraft({ id: makeId("sale-hold"), createdAt: new Date().toISOString(), label: suspendedSaleLabel, items: cart, paymentMethod, customerName, customerPhone, customerCategoryId: selectedCustomerCategoryId, staffMemberId: selectedStaffMemberId, discountPercent: activeSaleDiscountPercent, note: saleNote, orderReference: saleOrderReference });
    setStore((current) => ({ ...current, suspendedSaleDrafts: [draft, ...current.suspendedSaleDrafts].slice(0, 30) }));
    setSuspendedSaleLabel("");
    resetSaleDraft();
    toast.success(`تم تعليق «${draft.label}» محليًا دون تعديل المخزون.`);
  };

  const resumeSuspendedSale = (draft: SuspendedSaleDraft) => {
    const { items, skipped } = restoreSuspendedCartItems(store.products.filter((product) => getExpiryStatus(product.expiryDate).kind !== "expired"), draft);
    if (!items.length) {
      toast.error("لا يمكن استئناف هذه السلة لأن أصنافها لم تعد متاحة للبيع.");
      return;
    }
    setCart(items);
    setPaymentMethod(draft.paymentMethod);
    setCustomerName(draft.customerName);
    setCustomerPhone(draft.customerPhone);
    setSelectedCustomerCategoryId(store.customerCategories.some((category) => category.id === draft.customerCategoryId) ? draft.customerCategoryId : "");
    setSelectedStaffMemberId(store.localStaff.some((member) => member.id === draft.staffMemberId) ? draft.staffMemberId : "");
    setSaleDiscountPercent(String(draft.discountPercent));
    setSaleNote(draft.note);
    setSaleOrderReference(draft.orderReference);
    setStore((current) => ({ ...current, suspendedSaleDrafts: current.suspendedSaleDrafts.filter((entry) => entry.id !== draft.id) }));
    if (skipped) toast.info(`استؤنفت السلة بعد استبعاد ${skipped} أصناف غير متاحة وتحديث الكميات وفق المخزون الحالي.`);
    else toast.success("تم استئناف السلة وتحديثها وفق المخزون الحالي.");
  };

  const deleteSuspendedSale = (draft: SuspendedSaleDraft) => {
    if (!window.confirm(`سيُحذف تعليق «${draft.label}» دون إنشاء فاتورة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, suspendedSaleDrafts: current.suspendedSaleDrafts.filter((entry) => entry.id !== draft.id) }));
    toast.success("تم حذف السلة المعلقة محليًا.");
  };

  const handleBarcodeDetected = useCallback((barcode: string) => {
    setShowBarcodeScanner(false);
    const product = store.products.find((item) => item.sku.trim().toLowerCase() === barcode.trim().toLowerCase());
    if (product) {
      if (getExpiryStatus(product.expiryDate).kind === "expired") {
        toast.error(`تم مسح «${product.name}» لكن صلاحيته منتهية ولا يمكن إضافته للبيع.`);
        return;
      }
      addToCart(product);
      toast.success(`تمت إضافة «${product.name}» إلى السلة.`);
      return;
    }
    setPendingBarcode(barcode);
    setShowProductForm(true);
    toast.info(`الرمز ${barcode} غير مسجل. أضف بيانات الصنف لحفظه.`);
  }, [store.products]);

  const handleStocktakeBarcodeDetected = useCallback((barcode: string) => {
    setShowStocktakeScanner(false);
    const product = store.products.find((item) => item.sku.trim().toLowerCase() === barcode.trim().toLowerCase());
    if (!product) {
      toast.error("هذا الباركود غير مسجل في المخزون. أضف الصنف أولًا.");
      return;
    }
    setStocktakeProduct(product);
    setStocktakeQuantity(String(product.quantity));
  }, [store.products]);

  const openBarcodeStocktake = () => {
    if (!store.products.length) {
      toast.info("أضف صنفًا واحدًا على الأقل قبل بدء جولة الجرد بالباركود.");
      return;
    }
    if (!store.barcodeStocktakeDraft) {
      const now = new Date().toISOString();
      setStore((current) => ({ ...current, barcodeStocktakeDraft: createBarcodeStocktakeDraft(makeId("barcode-stocktake"), now) }));
    }
    setBarcodeStocktakeQuery("");
    setBarcodeStocktakeOnlyPending(false);
    setBarcodeStocktakeShelfFilter(inventoryShelfFilter);
    setExternalBarcodeReaderActive(true);
    setShowBarcodeStocktake(true);
    toast.info("قارئ USB أو بلوتوث جاهز: امسح الرمز ثم أرسل Enter. تبقى حقول العدّ اليدوية مستقلة.");
  };

  const updateBarcodeStocktakeCount = (productId: string, value: string) => {
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || !Number.isInteger(Number(value)))) return;
    setStore((current) => {
      const now = new Date().toISOString();
      const draft = current.barcodeStocktakeDraft ?? createBarcodeStocktakeDraft(makeId("barcode-stocktake"), now);
      const counts = { ...draft.counts };
      if (value === "") delete counts[productId];
      else counts[productId] = Math.max(0, Math.floor(Number(value)));
      return { ...current, barcodeStocktakeDraft: { ...draft, updatedAt: now, counts } };
    });
  };

  const updateProductShelfLocation = (productId: string, value: string) => {
    const shelfLocation = value.trim().slice(0, 50);
    setStore((current) => ({ ...current, products: current.products.map((product) => product.id === productId ? { ...product, shelfLocation } : product) }));
  };

  const handleBarcodeStocktakeDetected = useCallback((barcode: string) => {
    const product = store.products.find((item) => item.sku.trim().toLowerCase() === barcode.trim().toLowerCase());
    if (!product) {
      toast.error("هذا الباركود غير مسجل في المخزون. أضف الصنف أولًا.");
      return;
    }
    setStore((current) => {
      const now = new Date().toISOString();
      const draft = current.barcodeStocktakeDraft ?? createBarcodeStocktakeDraft(makeId("barcode-stocktake"), now);
      return { ...current, barcodeStocktakeDraft: { ...draft, updatedAt: now, counts: incrementBarcodeStocktakeCount(draft.counts, product.id) } };
    });
  }, [store.products]);

  useEffect(() => {
    if (!showBarcodeStocktake || !externalBarcodeReaderActive) return;
    const handleExternalReaderKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || event.ctrlKey || event.metaKey || event.altKey) return;
      const capture = captureExternalBarcodeKey(externalBarcodeBufferRef.current, event.key, Date.now());
      externalBarcodeBufferRef.current = capture.buffer;
      if (!capture.barcode) return;
      event.preventDefault();
      handleBarcodeStocktakeDetected(capture.barcode);
    };
    window.addEventListener("keydown", handleExternalReaderKey);
    return () => window.removeEventListener("keydown", handleExternalReaderKey);
  }, [externalBarcodeReaderActive, handleBarcodeStocktakeDetected, showBarcodeStocktake]);

  const connectThermalPrinter = async () => {
    const bluetooth = (navigator as BluetoothCapableNavigator).bluetooth;
    if (!bluetooth) {
      toast.info("اربط الطابعة الحرارية من إعدادات الهاتف أو الكمبيوتر، ثم اخترها من نافذة الطباعة.");
      return;
    }
    try {
      const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
      setPrinterSettings((current) => ({ ...current, ...makeDetectedPrinterProfile(device.name || "طابعة بلوتوث مرتبطة", "bluetooth") }));
      toast.success(`تم اختيار ${device.name || "الطابعة"}. استخدم زر طباعة الفاتورة لإرسالها عبر نافذة النظام.`);
    } catch {
      toast.info("لم يتم اختيار طابعة. يمكنك المحاولة لاحقًا من الإعدادات.");
    }
  };

  const detectUsbThermalPrinter = async () => {
    const usb = (navigator as UsbCapableNavigator).usb;
    if (!usb) {
      toast.info("لا يدعم هذا المتصفح كشف USB. استخدم «اختبار الطباعة» لاختيار الطابعة من نظام أندرويد.");
      return;
    }
    try {
      const device = await usb.requestDevice({ filters: [] });
      const detectedName = device.productName || `طابعة USB (${device.vendorId ?? ""}:${device.productId ?? ""})`;
      const detectedWidth = inferThermalPaperWidth(detectedName);
      setPrinterSettings((current) => ({ ...current, ...makeDetectedPrinterProfile(detectedName, "usb"), paperWidth: detectedWidth }));
      toast.success(`تم التعرف على ${detectedName}. راجع مقاس الورق ثم نفّذ اختبار الطباعة.`);
    } catch {
      toast.info("لم يتم اختيار طابعة USB. يمكنك استخدام اختبار الطباعة من نظام أندرويد.");
    }
  };

  const changeCartQuantity = (id: string, change: number) => {
    setCart((current) => current.flatMap((item) => {
      const available = store.products.find((product) => product.id === id)?.quantity ?? item.quantity;
      const nextQuantity = item.cartQuantity + change;
      if (nextQuantity <= 0) return [];
      if (nextQuantity > available) {
        toast.error("الكمية المطلوبة أكبر من المتوفر.");
        return [item];
      }
      return [{ ...item, cartQuantity: nextQuantity }];
    }));
  };

  const openSystemPrint = (title: string, content: string, targetWindow?: Window | null) => {
    const receiptWindow = targetWindow ?? window.open("", "_blank", "width=390,height=650");
    if (!receiptWindow) {
      toast.error("تعذّر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.");
      return false;
    }
    const { isA4, pageSize, contentWidth, padding, fontSize } = getPrintLayout(printerSettings.paperWidth);
    const logoSizing = getReceiptLogoSizing(printerSettings.paperWidth);
    receiptWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:${pageSize};margin:${isA4 ? "8mm" : "0"}}*{box-sizing:border-box}body{font-family:Arial,"Noto Sans Arabic",sans-serif;width:${contentWidth};box-sizing:border-box;margin:0 auto;color:#173c31;padding:${padding};font-size:${fontSize};background:#fff}.receipt-brand{text-align:center;margin:0 0 5px}.receipt-brand img{display:block;width:auto!important;height:auto!important;max-width:${logoSizing.maxWidthMm}mm!important;max-height:${logoSizing.maxHeightMm}mm!important;margin:0 auto 4px;object-fit:${logoSizing.objectFit}}h1{font-size:${isA4 ? "24px" : "18px"};margin:0 0 4px;text-align:center}p{text-align:center;color:#617066;margin:3px 0 10px}table{width:100%;border-collapse:collapse}th{text-align:right;color:#547065;font-size:.9em;padding:5px 0;border-bottom:1px solid #bfc9bf}td{padding:5px 0;border-bottom:1px dashed #bfc9bf}td:nth-child(2),td:nth-child(3),th:nth-child(2),th:nth-child(3){text-align:left;white-space:nowrap}.total{font-size:1.3em;font-weight:bold;border-top:2px solid #173c31;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between}.foot{font-size:.82em;margin-top:12px}.tag{display:inline-block;background:#edf2e8;padding:3px 7px;border-radius:999px;font-size:.9em}.receipt-qr{margin:10px auto 0;text-align:center}.receipt-qr img{width:${isA4 ? "32mm" : "24mm"};height:${isA4 ? "32mm" : "24mm"};display:block;margin:0 auto}.receipt-qr small{display:block;margin-top:2px;color:#687b70;font-size:.72em}.test-rule{border-top:1px dashed #173c31;margin:10px 0}.test-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;text-align:center}.test-grid span{padding:5px;background:#f2f5ef;border-radius:4px;font-size:.9em}@media print{button{display:none}}</style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`);
    receiptWindow.document.close();
    return true;
  };

  const printReceipt = async (sale: Sale) => {
    const receiptWindow = window.open("", "_blank", "width=390,height=650");
    if (!receiptWindow) {
      toast.error("تعذّر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.");
      return;
    }
    const rows = sale.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${money(item.price * item.quantity)}</td></tr>`).join("");
    const discountLine = sale.discountAmount ? `<div class="summary-line"><span>الخصم${sale.discountPercent ? ` (${sale.discountPercent}%)` : ""}</span><span>- ${money(sale.discountAmount)}</span></div>` : "";
    const phoneLine = store.storePhone ? `<br/>هاتف: ${escapeHtml(store.storePhone)}` : "";
    const receiptLogo = getReceiptLogoSource(store.receiptLogo, logoUrl);
    const qrDataUrl = await makeReceiptQrDataUrl(buildReceiptQrPayload(sale, store.storeName, store.storePhone)).catch(() => "");
    const qrBlock = buildReceiptQrMarkup(qrDataUrl);
    const receiptContent = buildReceiptPrintHtml({
      brandHtml: `<div class="receipt-brand"><img src="${receiptLogo}" alt="شعار ${escapeHtml(store.storeName)}" /><h1>${escapeHtml(store.storeName)}</h1></div>`,
      invoiceHtml: `<p>فاتورة رقم ${sale.id.slice(-5)} · ${formatDate(sale.createdAt)}${sale.orderReference ? `<br/>مرجع الطلب: ${escapeHtml(sale.orderReference)}` : ""}${sale.note ? `<br/>ملاحظة: ${escapeHtml(sale.note)}` : ""}</p>`,
      rowsHtml: rows,
      subtotalHtml: sale.subtotal !== undefined ? `<div class="summary-line"><span>المجموع</span><span>${money(sale.subtotal)}</span></div>` : "",
      discountHtml: discountLine,
      totalHtml: `<div class="total"><span>الإجمالي</span><span>${money(sale.total)}</span></div>`,
      qrHtml: qrBlock,
      footerHtml: `<p class="foot"><span class="tag">${sale.paymentMethod === "cash" ? "نقدًا" : "آجل"}</span><br/>شكرًا لتسوقكم معنا${phoneLine}</p>`,
    });
    openSystemPrint(`فاتورة ${sale.id.slice(-5)}`, receiptContent, receiptWindow);
  };

  const printReturnReceipt = (returnSale: Sale) => {
    const originalInvoiceNumber = returnSale.returnOfSaleId?.slice(-5) || "غير محدد";
    const receiptLogo = getReceiptLogoSource(store.receiptLogo, logoUrl);
    const phoneLine = store.storePhone ? `<br/>هاتف: ${escapeHtml(store.storePhone)}` : "";
    const receiptContent = buildReceiptPrintHtml({
      brandHtml: `<div class="receipt-brand"><img src="${receiptLogo}" alt="شعار ${escapeHtml(store.storeName)}" /><h1>${escapeHtml(store.storeName)}</h1></div>`,
      invoiceHtml: `<p>إيصال إرجاع رقم ${returnSale.id.slice(-5)} · ${formatDate(returnSale.createdAt)}<br/>مرجع الفاتورة ${escapeHtml(originalInvoiceNumber)}</p>`,
      rowsHtml: buildReturnReceiptRows(returnSale),
      subtotalHtml: returnSale.subtotal !== undefined ? `<div class="summary-line"><span>قيمة الأصناف</span><span>${money(Math.abs(returnSale.subtotal))}</span></div>` : "",
      discountHtml: returnSale.discountAmount ? `<div class="summary-line"><span>تسوية الخصم</span><span>${money(Math.abs(returnSale.discountAmount))}</span></div>` : "",
      totalHtml: `<div class="total"><span>إجمالي الإرجاع</span><span>${money(Math.abs(returnSale.total))}</span></div>`,
      qrHtml: "",
      footerHtml: `<p class="foot"><span class="tag">إرجاع ${returnSale.paymentMethod === "cash" ? "نقدي" : "ذمة"}</span><br/>السبب: ${escapeHtml(returnSale.returnReason || "غير محدد")}${phoneLine}</p>`,
    });
    openSystemPrint(`إيصال إرجاع ${returnSale.id.slice(-5)}`, receiptContent);
  };

  const printMonthlyReturnsSummary = () => {
    const reasonRows = returnReasonSummary.slice(0, 5).map((entry) => `<tr><td>${escapeHtml(entry.reason)}</td><td>${entry.receipts}</td><td>${entry.units}</td><td dir="ltr">${money(entry.value)}</td></tr>`).join("");
    const staffRows = staffReturnsReport.entries.map((entry) => `<tr><td>${escapeHtml(entry.staffMemberName)}</td><td>${entry.receipts}</td><td>${entry.units}</td><td dir="ltr">${money(entry.value)}</td></tr>`).join("");
    const content = `<h1>ملخص الإرجاعات الشهري</h1><p>${escapeHtml(store.storeName)} · ${currentMonthKey}</p><table><tbody><tr><th>إيصالات الإرجاع</th><td>${monthlyReturnComparison.current.receipts}</td></tr><tr><th>وحدات مرتجعة</th><td>${monthlyReturnComparison.current.units}</td></tr><tr><th>قيمة الإرجاع</th><td dir="ltr">${money(monthlyReturnComparison.current.value)}</td></tr><tr><th>مقارنة بالقيمة السابقة</th><td dir="ltr">${money(monthlyReturnComparison.valueChange)}</td></tr><tr><th>حد تنبيه نسبة الإرجاع</th><td>${store.returnRateAlertThreshold}%</td></tr></tbody></table><h2>أسباب الإرجاع</h2><table><thead><tr><th>السبب</th><th>الإيصالات</th><th>الوحدات</th><th>القيمة</th></tr></thead><tbody>${reasonRows || "<tr><td colspan=\"4\">لا توجد إرجاعات لهذا الشهر.</td></tr>"}</tbody></table><h2>الإرجاعات حسب الموظف</h2><table><thead><tr><th>الموظف</th><th>الإيصالات</th><th>الوحدات</th><th>القيمة</th></tr></thead><tbody>${staffRows || "<tr><td colspan=\"4\">لا توجد إرجاعات مرتبطة بموظف.</td></tr>"}</tbody></table><p class="foot">هذا الملخص مبني من الإرجاعات المسجلة محليًا على هذا الجهاز.</p>`;
    if (openSystemPrint(`ملخص الإرجاعات ${currentMonthKey}`, content)) toast.success("فُتح ملخص الإرجاعات الشهري للطباعة أو الحفظ من نافذة النظام.");
  };

  const downloadReceiptPdf = async (sale: Sale) => {
    try {
      const { jsPDF } = await import("jspdf");
      const receiptLines = buildReceiptPdfLines({
        storeName: store.storeName,
        storePhone: store.storePhone,
        invoiceNumber: sale.id.slice(-5),
        createdAt: formatDate(sale.createdAt),
        paymentLabel: sale.paymentMethod === "cash" ? "نقدًا" : "آجل / ذمة",
        items: sale.items,
        subtotal: sale.subtotal,
        discountAmount: sale.discountAmount,
        note: sale.note,
        orderReference: sale.orderReference,
        total: sale.total,
      });
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas unavailable");
      context.font = "24px Arial";
      const maxLineWidth = 700;
      const wrappedLines = receiptLines.flatMap((line) => {
        const words = line.split(" ");
        const rows: string[] = [];
        let row = "";
        words.forEach((word) => {
          const candidate = row ? `${row} ${word}` : word;
          if (row && context.measureText(candidate).width > maxLineWidth) { rows.push(row); row = word; } else row = candidate;
        });
        if (row) rows.push(row);
        return rows;
      });
      const qrDataUrl = await makeReceiptQrDataUrl(buildReceiptQrPayload(sale, store.storeName, store.storePhone)).catch(() => "");
      const qrHeight = qrDataUrl ? 210 : 0;
      canvas.height = Math.max(420, 90 + wrappedLines.length * 38 + qrHeight + 60);
      context.fillStyle = "#fffdf8";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.direction = "rtl";
      context.textAlign = "right";
      context.fillStyle = "#173c31";
      let y = 54;
      wrappedLines.forEach((line, index) => {
        context.font = index === 0 ? "bold 31px Arial" : line.startsWith("الإجمالي") ? "bold 28px Arial" : "24px Arial";
        context.fillText(line, 750, y);
        y += 38;
      });
      if (qrDataUrl) {
        const qrImage = new Image();
        await new Promise<void>((resolve, reject) => { qrImage.onload = () => resolve(); qrImage.onerror = () => reject(new Error("qr image")); qrImage.src = qrDataUrl; });
        context.drawImage(qrImage, 310, y + 10, 180, 180);
      }
      const heightMm = Math.min(297, Math.max(100, canvas.height / 10));
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, heightMm] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 80, heightMm);
      pdf.save(`souqna-invoice-${sale.id.slice(-5)}.pdf`);
      toast.success("تم تنزيل الإيصال كملف PDF.");
    } catch {
      toast.error("تعذّر إنشاء ملف PDF للإيصال. جرّب مرة أخرى.");
    }
  };

  const printTestReceipt = () => {
    const receiptLogo = getReceiptLogoSource(store.receiptLogo, logoUrl);
    const printed = openSystemPrint("اختبار طابعة سوقنا", `<div class="receipt-brand"><img src="${receiptLogo}" alt="شعار ${escapeHtml(store.storeName)}" /><h1>${escapeHtml(store.storeName)}</h1></div><p>اختبار طباعة سوقنا · ${formatDate(new Date().toISOString())}</p><div class="test-rule"></div><div class="test-grid"><span>العربية: سوقنا</span><span>1234567890</span><span>58/80/A4</span><span>د.ل 12,50</span></div><div class="test-rule"></div><p class="foot">إذا ظهر الشعار والحروف والأرقام بوضوح، اختر هذه الطابعة من نافذة النظام كطابعة افتراضية عند الحاجة.</p>`);
    if (printed) toast.success("فُتحت نافذة اختبار الطباعة. اختر أي طابعة ظاهرة في نظام جهازك.");
  };

  const printShelfLabels = () => {
    const products = store.products.filter((product) => selectedLabelProductIds.includes(product.id));
    if (!products.length) {
      toast.info("اختر صنفًا واحدًا على الأقل لطباعة ملصق سعره.");
      return;
    }
    const barcodeSvgs = Object.fromEntries(products.map((product) => [product.id, createCode128Svg(getPrintableBarcodeValue(product.sku))]));
    const printed = openSystemPrint(`ملصقات أسعار ${store.storeName}`, buildShelfLabelsPrintHtml(store.storeName, products, money, barcodeSvgs, labelSize));
    if (printed) {
      setShowShelfLabels(false);
      toast.success("فُتحت نافذة طباعة الملصقات. اختر طابعتك ومقاس الورق من النظام.");
    }
  };

  const printSupplierPurchaseList = () => {
    if (!supplierPurchaseList.length) {
      toast.success("لا توجد أصناف وصلت إلى حد إعادة الطلب الآن.");
      return;
    }
    const groupsHtml = supplierPurchaseList.map((group) => `<section style="margin:0 0 12px;break-inside:avoid"><h2 style="font-size:1.1em;margin:0 0 4px">${escapeHtml(group.supplierName)}</h2><table><thead><tr><th>الصنف</th><th>الرمز</th><th>المتوفر</th><th>الكمية المقترحة</th></tr></thead><tbody>${group.products.map((product) => `<tr><td>${escapeHtml(product.name)}</td><td dir="ltr">${escapeHtml(product.sku)}</td><td>${product.quantity}</td><td><strong>${product.suggestedQuantity}</strong></td></tr>`).join("")}</tbody></table></section>`).join("");
    const printed = openSystemPrint(`قائمة مشتريات ${store.storeName}`, `<h1>قائمة مشتريات الموردين</h1><p>${escapeHtml(store.storeName)} · ${todayKey()}</p>${groupsHtml}`);
    if (printed) toast.success("فُتحت قائمة المشتريات للطباعة أو الحفظ من نافذة النظام.");
  };

  const printSupplierReceivingNotice = (product: Product, batch: ProductBatch) => {
    const content = `<h1>إشعار استلام مورد</h1><p>${escapeHtml(store.storeName)} · ${formatDate(batch.receivedAt)}</p><table><tbody><tr><th>الصنف</th><td>${escapeHtml(product.name)}</td></tr><tr><th>رمز الصنف</th><td dir="ltr">${escapeHtml(product.sku)}</td></tr><tr><th>المورد</th><td>${escapeHtml(batch.supplierName || "غير محدد")}</td></tr>${batch.purchaseInvoiceRef ? `<tr><th>مرجع فاتورة الشراء</th><td dir="ltr">${escapeHtml(batch.purchaseInvoiceRef)}</td></tr>` : ""}<tr><th>الكمية المستلمة</th><td>${batch.quantity}</td></tr><tr><th>سعر شراء الوحدة</th><td dir="ltr">${money(batch.purchasePrice)}</td></tr><tr><th>تاريخ الصلاحية</th><td dir="ltr">${escapeHtml(batch.expiryDate || "غير محدد")}</td></tr>${batch.note ? `<tr><th>ملاحظة</th><td>${escapeHtml(batch.note)}</td></tr>` : ""}</tbody></table><p class="foot">تم إنشاء هذا الإشعار محليًا من سجل استلام المورد.</p>`;
    if (openSystemPrint(`استلام ${product.name}`, content)) toast.success("فُتح إشعار الاستلام للطباعة أو الحفظ من نافذة النظام.");
  };

  const printSupplierReturnNotice = (product: Product, batch: ProductBatch) => {
    if (!batch.supplierReturn) {
      toast.info("سجّل إرجاع الدفعة أولًا لإتاحة إشعار المورد.");
      return;
    }
    const content = buildSupplierReturnNoticeHtml(store.storeName, product, batch, money, formatDate, escapeHtml);
    if (openSystemPrint(`إرجاع ${product.name}`, content)) toast.success("فُتح إشعار إرجاع المورد للطباعة أو الحفظ من نافذة النظام.");
  };

  const submitBatchEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBatch) return;
    const data = new FormData(event.currentTarget);
    const changes = { quantity: Number(data.get("quantity")), purchasePrice: Number(data.get("purchasePrice")), expiryDate: String(data.get("expiryDate") || "").trim(), supplierName: String(data.get("supplierName") || "").trim(), purchaseInvoiceRef: String(data.get("purchaseInvoiceRef") || "").trim().slice(0, 100), note: String(data.get("note") || "").trim() };
    if (!Number.isFinite(changes.quantity) || changes.quantity <= 0 || !Number.isFinite(changes.purchasePrice) || changes.purchasePrice < 0 || (changes.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(changes.expiryDate))) {
      toast.error("راجع كمية الدفعة وسعرها وتاريخ صلاحيتها.");
      return;
    }
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== editingBatch.product.id) return product;
      const result = updateUnconsumedBatch(product.batches ?? [], editingBatch.batch.id, changes);
      if (!result.changed) return product;
      return { ...product, quantity: product.quantity + changes.quantity - editingBatch.batch.quantity, batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || product.expiryDate };
    }) }));
    setEditingBatch(null);
    toast.success("تم تعديل الدفعة غير المستهلكة وتحديث المخزون.");
  };

  const cancelBatch = (product: Product, batch: ProductBatch) => {
    if (!isBatchEditable(batch)) {
      toast.error("لا يمكن إلغاء دفعة استُهلك جزء منها؛ حفاظًا على دقة الفواتير والمخزون.");
      return;
    }
    if (!window.confirm(`سيُلغى استلام دفعة «${product.name}» بكمية ${batch.quantity} وحدة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, products: current.products.map((item) => {
      if (item.id !== product.id) return item;
      const result = cancelUnconsumedBatch(item.batches ?? [], batch.id);
      if (!result.cancelled) return item;
      return { ...item, quantity: Math.max(0, item.quantity - result.cancelled.quantity), batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || "" };
    }) }));
    toast.success("تم إلغاء الدفعة غير المستهلكة وتحديث المخزون.");
  };

  const exportExpiryWasteExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = expiryWasteReport.entries.map(({ product, batch, cost }) => ({ "الصنف": product.name, "الرمز": product.sku, "المورد": batch.supplierName || "غير محدد", "تاريخ الصلاحية": batch.expiryDate, "الكمية المهدرة": batch.remainingQuantity, "سعر الشراء": batch.purchasePrice, "تكلفة الهدر": cost, "ملاحظة الدفعة": batch.note }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد دفعات منتهية صالحة للحساب حاليًا" }]), "هدر الصلاحية");
    XLSX.writeFile(workbook, `souqna-expiry-waste-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير هدر الصلاحية.");
  };

  const submitWasteApproval = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wasteApprovalBatch) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    const requestedAt = new Date().toISOString();
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== wasteApprovalBatch.product.id) return product;
      const result = requestExpiredBatchWaste(product.batches ?? [], wasteApprovalBatch.batch.id, reason, requestedAt);
      return result.requested ? { ...product, batches: result.batches } : product;
    }) }));
    setWasteApprovalBatch(null);
    toast.success("تم تسجيل طلب الهدر. يلزم الآن اعتماد نهائي قبل خصم المخزون.");
  };

  const submitFinalWasteApproval = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!finalWasteApprovalBatch) return;
    const confirmation = String(new FormData(event.currentTarget).get("confirmation") || "").trim();
    const approvedAt = new Date().toISOString();
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== finalWasteApprovalBatch.product.id) return product;
      const result = approveRequestedBatchWaste(product.batches ?? [], finalWasteApprovalBatch.batch.id, confirmation, approvedAt);
      if (!result.approved) return product;
      return { ...product, quantity: Math.max(0, product.quantity - result.approved.quantity), batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || "" };
    }) }));
    if (confirmation !== "اعتماد نهائي") {
      toast.error("اكتب «اعتماد نهائي» لإتمام الموافقة الثانية.");
      return;
    }
    setFinalWasteApprovalBatch(null);
    toast.success("تم اعتماد هدر الدفعة نهائيًا وتحديث المخزون.");
  };

  const submitSupplierReturn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierReturnBatch) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    const returnedAt = new Date().toISOString();
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== supplierReturnBatch.product.id) return product;
      const result = returnUnconsumedBatchToSupplier(product.batches ?? [], supplierReturnBatch.batch.id, reason, returnedAt);
      if (!result.returned) return product;
      return { ...product, quantity: Math.max(0, product.quantity - result.returned.quantity), batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || "" };
    }) }));
    setSupplierReturnBatch(null);
    toast.success("تم تسجيل إرجاع الدفعة إلى المورد وتحديث المخزون.");
  };

  const exportSupplierInventoryCostExcel = async () => {
    const XLSX = await import("xlsx");
    const totals = supplierInventoryCostReport.groups.map((group) => ({ "المورد": group.supplierName, "عدد الدفعات": group.batchCount, "الوحدات المتبقية": group.units, "تكلفة المخزون": group.cost }));
    const details = supplierInventoryCostReport.groups.flatMap((group) => group.products.map(({ product, batch, cost }) => ({ "المورد": group.supplierName, "الصنف": product.name, "الرمز": product.sku, "الدفعة": batch.id, "الكمية المتبقية": batch.remainingQuantity, "سعر الشراء": batch.purchasePrice, "تكلفة الدفعة": cost, "تاريخ الصلاحية": batch.expiryDate || "غير محدد" })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(totals.length ? totals : [{ "ملاحظة": "لا توجد دفعات نشطة لها تكلفة مخزون حاليًا" }]), "ملخص الموردين");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(details.length ? details : [{ "ملاحظة": "لا توجد تفاصيل دفعات نشطة" }]), "تفاصيل الدفعات");
    XLSX.writeFile(workbook, `souqna-supplier-inventory-cost-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير تكلفة المخزون حسب المورد.");
  };

  const exportSupplierPurchasesExcel = async () => {
    const XLSX = await import("xlsx");
    const obligations = supplierObligationReport.obligations.map((item) => ({ "المورد": item.supplierName, "الرصيد المستحق": item.outstanding, "الحالة": item.status === "overdue" ? "متأخر" : item.status === "nearDue" ? "قريب" : item.status === "payable" ? "مستحق" : "بلا رصيد", "تاريخ الاستحقاق": item.dueDate || "غير محدد" }));
    const totals = supplierPurchaseReport.groups.map((group) => ({ "المورد": group.supplierName, "قيمة الاستلام": group.received, "قيمة الإرجاع": group.returned, "صافي المشتريات": group.net, "وحدات مستلمة": group.receivedUnits, "وحدات مرجعة": group.returnedUnits, "عدد الحركات": group.entryCount }));
    const details = supplierPurchaseReport.groups.flatMap((group) => group.entries.map((entry) => ({ "المورد": entry.supplierName, "التاريخ": entry.date, "العملية": entry.type, "الصنف": entry.productName, "الرمز": entry.sku, "مرجع الفاتورة": entry.invoiceRef || "غير محدد", "الدفعة": entry.batchId, "الكمية": entry.quantity, "القيمة": entry.amount })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(obligations.length ? obligations : [{ "ملاحظة": "لا توجد التزامات موردين مسجلة" }]), "الالتزامات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(totals.length ? totals : [{ "ملاحظة": "لا توجد مشتريات في الفترة المختارة" }]), "ملخص المشتريات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(details.length ? details : [{ "ملاحظة": "لا توجد تفاصيل مشتريات في الفترة المختارة" }]), "تفاصيل الحركات");
    XLSX.writeFile(workbook, `souqna-supplier-purchases-${supplierPurchasesMonth}.xlsx`);
    toast.success("تم تنزيل تقرير مشتريات الموردين والتزاماتهم.");
  };

  const exportLocalAnalysisExcel = async () => {
    const XLSX = await import("xlsx");
    const productRows = operationalInsights.map((entry) => ({ "الصنف": entry.productName, "الرمز": entry.sku, "المورد": entry.supplierName, "المخزون الحالي": entry.currentStock, "متوسط الطلب اليومي": Number(entry.averageDailyDemand.toFixed(2)), "أيام التغطية": entry.daysOfCover === null ? "غير متاح" : Number(entry.daysOfCover.toFixed(1)), "اتجاه الطلب": entry.demandTrend === "rising" ? "متصاعد" : entry.demandTrend === "falling" ? "متراجع" : entry.demandTrend === "new" ? "جديد" : entry.demandTrend === "stable" ? "مستقر" : "لا بيانات كافية", "حالة المخزون": entry.risk === "urgent" ? "عاجل" : entry.risk === "watch" ? "متابعة" : entry.risk === "healthy" ? "مطمئن" : "بلا حركة حديثة", "كمية الشراء المقترحة": entry.recommendedOrderQuantity, "تكلفة الشراء التقديرية": entry.estimatedOrderCost, "التفسير": entry.explanation }));
    const supplierRows = purchaseRecommendations.map((group) => ({ "المورد": group.supplierName, "الوحدات المقترحة": group.units, "تكلفة تقديرية": group.estimatedCost, "أصناف عاجلة": group.urgentItems, "عدد الأصناف": group.entries.length }));
    const cashRows = [{ "الأفق المتوقع بالأيام": cashFlowForecast.horizonDays, "متوسط دخل نقدي يومي": cashFlowForecast.averageDailyIncome, "متوسط مصروف يومي": cashFlowForecast.averageDailyExpenses, "دخل متوقع": cashFlowForecast.projectedIncome, "مصروفات متوقعة": cashFlowForecast.projectedExpenses, "صافي سيولة متوقع": cashFlowForecast.projectedNet, "الحالة": cashFlowForecast.signal === "positive" ? "موجب" : cashFlowForecast.signal === "watch" ? "يحتاج متابعة" : "سلبي", "التفسير": cashFlowForecast.explanation }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows.length ? productRows : [{ "ملاحظة": "لا توجد أصناف كافية للتحليل بعد" }]), "طلب الأصناف");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(supplierRows.length ? supplierRows : [{ "ملاحظة": "لا توجد توصيات شراء حاليًا" }]), "توصيات الموردين");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cashRows), "توقع السيولة");
    XLSX.writeFile(workbook, `souqna-local-analysis-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير التحليل التشغيلي المحلي.");
  };

  const exportLocalOperationsExcel = async () => {
    const XLSX = await import("xlsx");
    const goalRows = Object.values(store.dailySalesGoals).sort((left, right) => right.date.localeCompare(left.date)).map((goal) => {
      const revenue = store.sales.filter((sale) => sale.createdAt.slice(0, 10) === goal.date).reduce((total, sale) => total + sale.total, 0);
      const progress = getDailyGoalProgress(goal, revenue);
      return { "التاريخ": goal.date, "هدف المبيعات": goal.target, "المبيعات المسجلة": progress.revenue, "نسبة الإنجاز": Number(progress.achievement.toFixed(1)), "المتبقي": progress.remaining, "الحالة": progress.met ? "تم تحقيق الهدف" : "قيد المتابعة", "ضبط الهدف في": goal.setAt };
    });
    const monthlyGoalRows = Object.values(store.monthlySalesGoals).sort((left, right) => right.month.localeCompare(left.month)).map((goal) => {
      const revenue = store.sales.filter((sale) => sale.createdAt.slice(0, 7) === goal.month).reduce((total, sale) => total + sale.total, 0);
      const progress = getMonthlyGoalProgress(goal, revenue);
      return { "الشهر": goal.month, "هدف المبيعات": goal.target, "المبيعات المسجلة": progress.revenue, "نسبة الإنجاز": Number(progress.achievement.toFixed(1)), "المتبقي": progress.remaining, "الحالة": progress.met ? "تم تحقيق الهدف" : "قيد المتابعة", "ضبط الهدف في": goal.setAt };
    });
    const stocktakeRows = store.stocktakeRecords.map((record) => ({ "نوع الجرد": record.id.startsWith("barcode-stocktake-") ? "جولة باركود" : record.id.startsWith("bulk-stocktake-") ? "جرد جماعي" : "جرد فردي", "التاريخ": record.recordedAt, "الصنف": record.productName, "الرمز": record.sku, "الكمية المسجلة": record.recordedQuantity, "الكمية الفعلية": record.actualQuantity, "الفارق": record.difference, "قيمة الفارق بسعر الشراء": record.valueDifference, "ملاحظة": record.note }));
    const stocktakeComparisonRows = stocktakeRunComparison.runs.map((run, index) => ({ "ترتيب الجولة": index === 0 ? "الأحدث" : index === 1 ? "السابقة" : `قبلها بـ${index - 1}`, "تاريخ الاعتماد": run.recordedAt, "ملاحظة": run.note, "أصناف مراجعة": run.products, "أصناف بفروقات": run.adjustedProducts, "وحدات عجز": run.shortageUnits, "وحدات زيادة": run.surplusUnits, "قيمة العجز": run.shortageValue, "قيمة الزيادة": run.surplusValue }));
    const returnRows = saleReturns.flatMap((sale) => sale.items.map((item) => ({ "تاريخ الإرجاع": sale.createdAt, "مرجع الفاتورة": sale.returnOfSaleId?.slice(-5) || "غير محدد", "نوع الإرجاع": "جزئي أو كامل بحسب الكمية المختارة", "الصنف": item.name, "الكمية المرتجعة": Math.abs(item.quantity), "قيمة الإرجاع": Math.abs(item.quantity * item.price), "سبب الإرجاع": sale.returnReason || "غير محدد", "طريقة التسوية": sale.paymentMethod === "cash" ? "نقدًا" : "تخفيض ذمة غير محصلة" })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(goalRows.length ? goalRows : [{ "ملاحظة": "لا توجد أهداف مبيعات محفوظة بعد" }]), "أهداف المبيعات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyGoalRows.length ? monthlyGoalRows : [{ "ملاحظة": "لا توجد أهداف شهرية محفوظة بعد" }]), "أهداف الشهر");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stocktakeRows.length ? stocktakeRows : [{ "ملاحظة": "لا توجد فروقات جرد محفوظة بعد" }]), "سجل الجرد");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stocktakeComparisonRows.length ? stocktakeComparisonRows : [{ "ملاحظة": "تحتاج إلى اعتماد جولة جرد واحدة على الأقل لعرض المقارنة" }]), "مقارنة الجرد");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(returnRows.length ? returnRows : [{ "ملاحظة": "لا توجد إرجاعات بيع محفوظة بعد" }]), "إرجاعات البيع");
    XLSX.writeFile(workbook, `souqna-local-operations-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير الأهداف والجرد والإرجاعات الموسع.");
  };

  const exportProductProfitabilityExcel = async () => {
    const XLSX = await import("xlsx");
    const profitabilityRows = productProfitabilityReport.entries.map((entry) => ({ "الصنف": entry.productName, "وحدات مباعة": entry.soldUnits, "وحدات مرتجعة": entry.returnedUnits, "نسبة الإرجاع (%)": Number(entry.returnRatePercent.toFixed(1)), "الوحدات الصافية": entry.units, "الإيراد قبل الخصم": entry.grossRevenue, "الخصومات": entry.discounts, "الإيراد الصافي": entry.netRevenue, "تكلفة البضاعة": entry.costOfGoods, "الربح": entry.profit, "هامش الربح (%)": Number(entry.marginPercent.toFixed(1)), "عدد الحركات": entry.transactionCount }));
    const summaryRows = [{ "الفترة": currentMonthKey, "وحدات مباعة": productProfitabilityReport.totals.soldUnits, "وحدات مرتجعة": productProfitabilityReport.totals.returnedUnits, "نسبة الإرجاع الإجمالية (%)": productProfitabilityReport.totals.soldUnits ? Number(((productProfitabilityReport.totals.returnedUnits / productProfitabilityReport.totals.soldUnits) * 100).toFixed(1)) : 0, "الوحدات الصافية": productProfitabilityReport.totals.units, "الإيراد قبل الخصم": productProfitabilityReport.totals.grossRevenue, "الخصومات": productProfitabilityReport.totals.discounts, "الإيراد الصافي": productProfitabilityReport.totals.netRevenue, "تكلفة البضاعة": productProfitabilityReport.totals.costOfGoods, "الربح": productProfitabilityReport.totals.profit }];
    const categoryRows = store.customerCategories.map((category) => ({ "فئة الزبون": category.name, "الخصم الافتراضي (%)": category.discountPercent, "عدد الفواتير": store.sales.filter((sale) => sale.customerCategoryId === category.id).length, "مبيعات الفئة": store.sales.filter((sale) => sale.customerCategoryId === category.id).reduce((total, sale) => total + sale.total, 0) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(profitabilityRows.length ? profitabilityRows : [{ "ملاحظة": "لا توجد مبيعات كافية لحساب ربحية الأصناف" }]), "ربحية الأصناف");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "ملخص الربحية");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryRows.length ? categoryRows : [{ "ملاحظة": "لا توجد فئات زبائن محفوظة" }]), "فئات الزبائن");
    XLSX.writeFile(workbook, `souqna-product-profitability-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تقرير ربحية الأصناف وفئات الزبائن.");
  };

  const exportFilteredReturnsExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filteredSaleReturns.flatMap((sale) => sale.items.map((item) => ({ "تاريخ الإرجاع": sale.createdAt, "رقم إيصال الإرجاع": sale.id.slice(-5), "مرجع الفاتورة": sale.returnOfSaleId?.slice(-5) || "غير محدد", "الصنف": item.name, "الكمية المرتجعة": Math.abs(item.quantity), "قيمة الإرجاع": Math.abs(item.quantity * item.price), "سبب الإرجاع": sale.returnReason || "غير محدد", "طريقة التسوية": sale.paymentMethod === "cash" ? "نقدًا" : "تخفيض ذمة" })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد إرجاعات تطابق التصفية الحالية" }]), "الإرجاعات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ "من تاريخ": returnFilterFromDate || "بلا حد", "إلى تاريخ": returnFilterToDate || "بلا حد", "سبب الإرجاع": returnReasonFilter || "كل الأسباب", "عدد إيصالات الإرجاع": filteredSaleReturns.length, "إجمالي قيمة الإرجاع": filteredSaleReturns.reduce((total, sale) => total + Math.abs(sale.total), 0) }]), "ملخص التصفية");
    XLSX.writeFile(workbook, `souqna-returns-${todayKey()}.xlsx`);
    toast.success("تم تنزيل سجل الإرجاعات المفلتر.");
  };

  const exportAdvancedReturnAnalyticsExcel = async () => {
    const XLSX = await import("xlsx");
    const reasonRows = returnReasonSummary.map((entry) => ({ "سبب الإرجاع": entry.reason, "عدد الإيصالات": entry.receipts, "الوحدات المرتجعة": entry.units, "قيمة الإرجاع": entry.value }));
    const comparisonRows = [{ "الشهر الحالي": monthlyReturnComparison.month, "إيصالات الشهر الحالي": monthlyReturnComparison.current.receipts, "وحدات الشهر الحالي": monthlyReturnComparison.current.units, "قيمة الشهر الحالي": monthlyReturnComparison.current.value, "الشهر السابق": monthlyReturnComparison.previousMonth, "إيصالات الشهر السابق": monthlyReturnComparison.previous.receipts, "وحدات الشهر السابق": monthlyReturnComparison.previous.units, "قيمة الشهر السابق": monthlyReturnComparison.previous.value, "فرق الإيصالات": monthlyReturnComparison.receiptChange, "فرق القيمة": monthlyReturnComparison.valueChange }];
    const riskRows = highReturnRateProducts.map((entry) => ({ "الصنف": entry.productName, "وحدات مباعة": entry.soldUnits, "وحدات مرتجعة": entry.returnedUnits, "نسبة الإرجاع (%)": Number(entry.returnRatePercent.toFixed(1)), "حد التنبيه المطبق (%)": store.returnRateAlertThreshold, "الحالة": "تحتاج مراجعة" }));
    const staffRows = staffReturnsReport.entries.map((entry) => ({ "الموظف": entry.staffMemberName, "إيصالات الإرجاع": entry.receipts, "الوحدات المرتجعة": entry.units, "قيمة الإرجاع": entry.value }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reasonRows.length ? reasonRows : [{ "ملاحظة": "لا توجد أسباب إرجاع محفوظة بعد" }]), "أسباب الإرجاع");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(comparisonRows), "مقارنة شهرية");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(riskRows.length ? riskRows : [{ "ملاحظة": "لا توجد أصناف تجاوزت حد نسبة الإرجاع" }]), "تنبيهات النسبة");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows.length ? staffRows : [{ "ملاحظة": "لا توجد إرجاعات مسجلة للموظفين هذا الشهر" }]), "إرجاعات الموظفين");
    XLSX.writeFile(workbook, `souqna-return-analytics-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تحليلات الإرجاع المتقدمة.");
  };

  const exportStaffSalesExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = staffSalesReport.entries.map((entry) => ({ "الموظف": entry.staffMemberName, "فواتير البيع": entry.invoices, "الإرجاعات": entry.returns, "صافي المبيعات": entry.sales, "صافي الربح": entry.profit }));
    const detailRows = store.sales.filter((sale) => sale.createdAt.slice(0, 7) === currentMonthKey).map((sale) => ({ "التاريخ": sale.createdAt, "الموظف": sale.staffMemberName || "غير محدد", "رقم الفاتورة": sale.id.slice(-5), "نوع الحركة": sale.isReturn ? "إرجاع بيع" : "بيع", "طريقة الدفع": sale.paymentMethod === "credit" ? "آجل" : "نقدي", "الإجمالي": sale.total, "الربح": sale.profit }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ "ملاحظة": "لا توجد مبيعات مسجلة للموظفين هذا الشهر" }]), "ملخص الموظفين");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ "ملاحظة": "لا توجد فواتير لهذا الشهر" }]), "تفاصيل الفواتير");
    XLSX.writeFile(workbook, `souqna-staff-sales-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تقرير مبيعات الموظفين محليًا.");
  };

  const exportInventoryCategoriesExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = inventoryCategorySummary.map((group) => ({ "الفئة": group.category, "عدد الأصناف": group.productCount, "الوحدات المتاحة": group.units, "قيمة الشراء": group.purchaseValue, "قيمة البيع": group.saleValue, "أصناف تحت الحد": group.lowStockCount }));
    const detailRows = store.products.map((product) => ({ "الفئة": product.category || "غير مصنف", "الصنف": product.name, "الرمز": product.sku, "الكمية": product.quantity, "حد التنبيه": product.lowStockAt, "سعر الشراء": product.purchasePrice, "سعر البيع": product.salePrice, "قيمة الشراء": product.quantity * product.purchasePrice, "قيمة البيع": product.quantity * product.salePrice }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ "ملاحظة": "لا توجد أصناف مصنفة بعد" }]), "ملخص الفئات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ "ملاحظة": "لا توجد أصناف في المخزون" }]), "أصناف الفئات");
    XLSX.writeFile(workbook, `souqna-inventory-categories-${todayKey()}.xlsx`);
    toast.success("تم تنزيل جرد المخزون حسب الفئات.");
  };

  const exportCustomerStatementExcel = async () => {
    if (!customerStatement) {
      toast.info("اختر زبونًا أولًا لتنزيل كشف حسابه.");
      return;
    }
    const XLSX = await import("xlsx");
    const rows = customerStatement.entries.map((entry) => ({ "التاريخ": entry.occurredAt, "العملية": entry.type, "المرجع": entry.reference, "مدين": entry.debit, "دائن": entry.credit, "الرصيد المتدرج": entry.balance, "ملاحظة": entry.note }));
    const summary = [{ "الزبون": customerStatement.customerName, "إجمالي فواتير الآجل": customerStatement.invoiced, "إرجاعات البيع": customerStatement.returned, "التحصيلات": customerStatement.collected, "الرصد المستحق": customerStatement.balance }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد حركات لهذا الزبون" }]), "الحركات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "الملخص");
    XLSX.writeFile(workbook, `souqna-customer-statement-${todayKey()}.xlsx`);
    toast.success("تم تنزيل كشف حساب الزبون محليًا.");
  };

  const printCustomerStatement = () => {
    if (!customerStatement) {
      toast.info("اختر زبونًا أولًا لطباعة كشف حسابه.");
      return;
    }
    const rows = customerStatement.entries.map((entry) => `<tr><td>${formatDate(entry.occurredAt)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.reference)}</td><td dir="ltr">${entry.debit ? money(entry.debit) : "—"}</td><td dir="ltr">${entry.credit ? money(entry.credit) : "—"}</td><td dir="ltr">${money(entry.balance)}</td></tr>`).join("");
    const content = `<h1>كشف حساب زبون</h1><p>${escapeHtml(store.storeName)} · ${escapeHtml(customerStatement.customerName)} · ${formatDate(new Date().toISOString())}</p><table><thead><tr><th>التاريخ</th><th>العملية</th><th>المرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${rows || "<tr><td colspan=\"6\">لا توجد حركات محفوظة.</td></tr>"}</tbody></table><table><tbody><tr><th>فواتير الآجل</th><td dir="ltr">${money(customerStatement.invoiced)}</td></tr><tr><th>إرجاعات البيع</th><td dir="ltr">${money(customerStatement.returned)}</td></tr><tr><th>التحصيلات</th><td dir="ltr">${money(customerStatement.collected)}</td></tr><tr><th>الرصد المستحق</th><td dir="ltr">${money(customerStatement.balance)}</td></tr></tbody></table><p class="foot">كشف محلي مبني على فواتير الذمة والتحصيلات والإرجاعات المحفوظة على هذا الجهاز.</p>`;
    if (openSystemPrint(`كشف ${customerStatement.customerName}`, content)) toast.success("فُتح كشف حساب الزبون للطباعة أو الحفظ من نافذة النظام.");
  };

  const exportCashClosingsExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = store.cashClosings.map((closing) => {
      const summary = getDailyCashSummary(store.sales, store.cashExpenses, closing.date, closing.openingCash, closing.actualCash, store.debtCollections);
      return { "تاريخ الوردية": closing.date, "مسؤول الوردية": closing.responsibleName || "غير محدد", "النقد الافتتاحي": closing.openingCash, "النقد المتوقع": summary.expectedCash, "النقد الفعلي": closing.actualCash, "الفارق": summary.variance ?? 0, "صافي التشغيل": summary.netOperatingProfit, "فئات النقد": (closing.denominations ?? []).map((entry) => `${entry.denomination}×${entry.count}`).join(" · ") || "غير مسجلة", "ملاحظة": closing.note || "" };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد تسويات ورديات محفوظة بعد" }]), "تسويات الوردية");
    XLSX.writeFile(workbook, `souqna-cash-settlements-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير تسويات الوردية.");
  };

  const updateSupplierCreditLimit = (supplierName: string, value: string) => {
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit < 0) return;
    setSupplierCreditLimits((current) => {
      const next = { ...current, [supplierName]: limit };
      localStorage.setItem(SUPPLIER_CREDIT_LIMITS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateSupplierDueDate = (supplierName: string, value: string) => {
    setStore((current) => ({ ...current, supplierDueDates: { ...current.supplierDueDates, [supplierName]: value } }));
  };

  const printSupplierPaymentNotice = (payment: SupplierPayment) => {
    const content = `<h1>مستند دفع للمورد</h1><p>${escapeHtml(store.storeName)} · ${formatDate(payment.paidAt)}</p><table><tbody><tr><th>المورد</th><td>${escapeHtml(payment.supplierName)}</td></tr><tr><th>المبلغ المدفوع</th><td dir="ltr">${money(payment.amount)}</td></tr>${payment.note ? `<tr><th>ملاحظة</th><td>${escapeHtml(payment.note)}</td></tr>` : ""}</tbody></table><p class="foot">تم إنشاء المستند محليًا من سجل مدفوعات الموردين.</p>`;
    return openSystemPrint(`دفع ${payment.supplierName}`, content);
  };

  const submitSupplierPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierPaymentSupplier) return;
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const note = String(data.get("note") || "").trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("أدخل مبلغ دفع صحيحًا أكبر من صفر.");
      return;
    }
    const payment: SupplierPayment = { id: makeId("supplier-payment"), supplierName: supplierPaymentSupplier, amount, paidAt: new Date().toISOString(), note };
    setStore((current) => ({ ...current, supplierPayments: [...current.supplierPayments, payment] }));
    setSupplierPaymentSupplier(null);
    const opened = printSupplierPaymentNotice(payment);
    toast.success(opened ? "تم تسجيل الدفع وفتح مستند المورد للطباعة أو الحفظ." : "تم تسجيل دفع المورد محليًا.");
  };

  const printSupplierMonthlyStatement = (supplierName: string) => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const statement = getSupplierMonthlyStatement(store.products, store.supplierPayments, supplierName, monthKey);
    const rows = statement.entries.map((entry) => `<tr><td>${formatDate(entry.date)}</td><td>${entry.type}</td><td>${escapeHtml(entry.detail)}</td><td dir="ltr">${money(entry.amount)}</td></tr>`).join("");
    const content = `<h1>كشف حساب المورد الشهري</h1><p>${escapeHtml(store.storeName)} · ${escapeHtml(supplierName)} · ${monthKey}</p><table><thead><tr><th>التاريخ</th><th>العملية</th><th>التفاصيل</th><th>القيمة</th></tr></thead><tbody>${rows || "<tr><td colspan=\"4\">لا توجد حركات لهذا الشهر.</td></tr>"}</tbody></table><table><tbody><tr><th>إجمالي الاستلام</th><td dir="ltr">${money(statement.received)}</td></tr><tr><th>إجمالي الإرجاع</th><td dir="ltr">${money(statement.returned)}</td></tr><tr><th>إجمالي المدفوع</th><td dir="ltr">${money(statement.paid)}</td></tr><tr><th>صافي الشهر</th><td dir="ltr">${money(statement.net)}</td></tr></tbody></table>`;
    if (openSystemPrint(`كشف ${supplierName}`, content)) toast.success("فُتح كشف حساب المورد للطباعة أو الحفظ من نافذة النظام.");
  };

  const printCashClosing = (closing: CashClosing) => {
    const summary = getDailyCashSummary(store.sales, store.cashExpenses, closing.date, closing.openingCash, closing.actualCash, store.debtCollections);
    const varianceLabel = summary.variance === 0 ? "متطابق" : summary.variance && summary.variance > 0 ? "زيادة" : "عجز";
    const denominationRows = getActiveCashDenominations(closing.denominations).map((entry) => `<tr><td dir="ltr">${entry.denomination} د.ل × ${entry.count}</td><td dir="ltr">${money(entry.denomination * entry.count)}</td></tr>`).join("");
    const denominationsHtml = denominationRows ? `<h2>عدّ النقد بالفئات</h2><table><thead><tr><th>الفئة والعدد</th><th>الإجمالي</th></tr></thead><tbody>${denominationRows}</tbody></table>` : "";
    const content = `<h1>تسوية وإغلاق وردية يومي</h1><p>${escapeHtml(store.storeName)} · ${closing.date} · ${formatDate(closing.closedAt)}</p><table><tbody>${closing.responsibleName ? `<tr><th>مسؤول الوردية</th><td>${escapeHtml(closing.responsibleName)}</td></tr>` : ""}<tr><th>النقد الافتتاحي</th><td dir="ltr">${money(closing.openingCash)}</td></tr><tr><th>مبيعات نقدية مسجلة</th><td dir="ltr">${money(summary.cashSales)}</td></tr><tr><th>تحصيل ذمم</th><td dir="ltr">${money(summary.debtCollections)}</td></tr><tr><th>مصروفات مسجلة</th><td dir="ltr">-${money(summary.expenses)}</td></tr><tr><th>النقد المتوقع</th><td dir="ltr">${money(summary.expectedCash)}</td></tr><tr><th>النقد الفعلي</th><td dir="ltr">${money(closing.actualCash)}</td></tr><tr><th>${varianceLabel}</th><td dir="ltr">${money(Math.abs(summary.variance ?? 0))}</td></tr><tr><th>صافي ربح التشغيل</th><td dir="ltr">${money(summary.netOperatingProfit)}</td></tr></tbody></table>${denominationsHtml}${closing.note ? `<p><strong>ملاحظة:</strong> ${escapeHtml(closing.note)}</p>` : ""}<p class="foot">الحساب يعتمد على مبيعات النقد وتحصيل الذمم ومصروفات اليوم المسجلة داخل سوقنا.</p>`;
    return openSystemPrint(`إغلاق وردية ${closing.date}`, content);
  };

  const submitCashExpense = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const category = String(data.get("category") || "").trim();
    const note = String(data.get("note") || "").trim();
    const date = String(data.get("date") || todayKey());
    if (!Number.isFinite(amount) || amount <= 0 || !category) {
      toast.error("أدخل مبلغًا صحيحًا واختر وصفًا للمصروف.");
      return;
    }
    const expense: CashExpense = { id: makeId("cash-expense"), amount, category, note, spentAt: `${date}T12:00:00.000Z` };
    setStore((current) => ({ ...current, cashExpenses: [...current.cashExpenses, expense] }));
    setShowCashExpenseForm(false);
    toast.success("تم تسجيل المصروف محليًا وتحديث صافي تشغيل اليوم.");
  };

  const submitCashClosing = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date") || todayKey());
    const openingCash = Number(data.get("openingCash"));
    const manualActualCash = Number(data.get("actualCash"));
    const denominations = getActiveCashDenominations(countedCashEntries);
    const actualCash = denominations.length ? countedCashTotal : manualActualCash;
    const note = String(data.get("note") || "").trim();
    const responsibleName = String(data.get("responsibleName") || "").trim().slice(0, 80);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(openingCash) || openingCash < 0 || !Number.isFinite(actualCash) || actualCash < 0) {
      toast.error("أدخل تاريخًا ومبالغ نقدية صحيحة لإغلاق الوردية.");
      return;
    }
    const closing: CashClosing = { id: makeId("cash-closing"), date, openingCash, actualCash, denominations, responsibleName, note, closedAt: new Date().toISOString() };
    setStore((current) => ({ ...current, cashClosings: [...current.cashClosings.filter((entry) => entry.date !== date), closing] }));
    setCashDenominationCounts({});
    setShowCashClosingForm(false);
    const opened = printCashClosing(closing);
    toast.success(opened ? "تم اعتماد الإغلاق وفتح مستند الوردية للطباعة أو الحفظ." : "تم اعتماد إغلاق الوردية محليًا.");
  };

  const openCashClosingForm = () => {
    const previousCounts = Object.fromEntries((todayCashClosing?.denominations ?? []).map((entry) => [entry.denomination, String(entry.count)]));
    setCashDenominationCounts(previousCounts);
    setShowCashClosingForm(true);
  };

  const submitDailySalesGoal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date") || todayKey());
    const target = Number(data.get("target"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(target) || target <= 0) {
      toast.error("أدخل تاريخًا وهدف مبيعات صحيحًا أكبر من صفر.");
      return;
    }
    setStore((current) => ({ ...current, dailySalesGoals: { ...current.dailySalesGoals, [date]: { date, target, setAt: new Date().toISOString() } } }));
    setShowDailyGoalForm(false);
    toast.success(`تم حفظ هدف مبيعات ${money(target)} ليوم ${date} محليًا.`);
  };

  const clearDailySalesGoal = () => {
    setStore((current) => {
      const dailySalesGoals = { ...current.dailySalesGoals };
      delete dailySalesGoals[todayKey()];
      return { ...current, dailySalesGoals };
    });
    setShowDailyGoalForm(false);
    toast.success("تمت إزالة هدف مبيعات اليوم.");
  };

  const submitMonthlySalesGoal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const month = String(data.get("month") || currentMonthKey);
    const target = Number(data.get("target"));
    if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(target) || target <= 0) {
      toast.error("أدخل شهرًا وهدف مبيعات صحيحًا أكبر من صفر.");
      return;
    }
    setStore((current) => ({ ...current, monthlySalesGoals: { ...current.monthlySalesGoals, [month]: { month, target, setAt: new Date().toISOString() } } }));
    setShowMonthlyGoalForm(false);
    toast.success(`تم حفظ هدف مبيعات ${money(target)} لشهر ${month} محليًا.`);
  };

  const clearMonthlySalesGoal = () => {
    setStore((current) => {
      const monthlySalesGoals = { ...current.monthlySalesGoals };
      delete monthlySalesGoals[currentMonthKey];
      return { ...current, monthlySalesGoals };
    });
    setShowMonthlyGoalForm(false);
    toast.success("تمت إزالة هدف مبيعات الشهر الحالي.");
  };

  const addCustomerCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const discountPercent = Number(data.get("discountPercent"));
    if (!name || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      toast.error("اكتب اسم فئة وخصمًا من 0% إلى 100%.");
      return;
    }
    if (store.customerCategories.some((category) => category.name.toLocaleLowerCase("ar") === name.toLocaleLowerCase("ar"))) {
      toast.error("توجد فئة زبائن بهذا الاسم بالفعل.");
      return;
    }
    setStore((current) => ({ ...current, customerCategories: [...current.customerCategories, { id: makeId("customer-category"), name, discountPercent }] }));
    event.currentTarget.reset();
    toast.success(`تم حفظ فئة «${name}» بخصم ${discountPercent}%.`);
  };

  const deleteCustomerCategory = (category: CustomerCategory) => {
    if (!window.confirm(`سيُحذف تصنيف «${category.name}» فقط. تبقى الفواتير السابقة كما هي. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, customerCategories: current.customerCategories.filter((item) => item.id !== category.id) }));
    if (selectedCustomerCategoryId === category.id) {
      setSelectedCustomerCategoryId("");
      setSaleDiscountPercent(String(store.defaultDiscountPercent));
    }
    toast.success("تم حذف فئة الزبائن محليًا.");
  };

  const updateCustomerCreditLimit = (customer: string, value: string) => {
    const name = customer.trim();
    const key = name.toLocaleLowerCase("ar");
    if (!name) {
      toast.info("اختر أو اكتب اسم زبون أولًا لضبط سقف ائتمانه.");
      return;
    }
    if (!value.trim()) {
      setStore((current) => {
        const customerCreditLimits = { ...current.customerCreditLimits };
        delete customerCreditLimits[key];
        return { ...current, customerCreditLimits };
      });
      toast.success("تمت إزالة سقف ائتمان الزبون.");
      return;
    }
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit < 0) {
      toast.error("أدخل سقف ائتمان صحيحًا يساوي صفرًا أو أكبر.");
      return;
    }
    setStore((current) => ({ ...current, customerCreditLimits: { ...current.customerCreditLimits, [key]: limit } }));
    toast.success("تم حفظ سقف ائتمان الزبون محليًا.");
  };

  const addLocalStaffMember = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") || "").trim();
    if (!name) {
      toast.error("اكتب اسم الموظف.");
      return;
    }
    if (store.localStaff.some((member) => member.name.toLocaleLowerCase("ar") === name.toLocaleLowerCase("ar"))) {
      toast.error("يوجد موظف بهذا الاسم بالفعل.");
      return;
    }
    setStore((current) => ({ ...current, localStaff: [...current.localStaff, { id: makeId("staff"), name }] }));
    event.currentTarget.reset();
    toast.success(`تم حفظ الموظف «${name}» محليًا.`);
  };

  const deleteLocalStaffMember = (member: LocalStaffMember) => {
    if (!window.confirm(`سيُحذف اسم «${member.name}» من قائمة الاختيار فقط، وتبقى فواتيره السابقة محفوظة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, localStaff: current.localStaff.filter((item) => item.id !== member.id) }));
    if (selectedStaffMemberId === member.id) setSelectedStaffMemberId("");
    toast.success("تم حذف الموظف من قائمة الاختيار المحلية.");
  };

  const runSensitiveAction = (title: string, action: () => void) => {
    if (!actionLockSettings.enabled) {
      action();
      return;
    }
    setActionLockPin("");
    setPendingProtectedAction({ title, action });
  };

  const verifySensitiveAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingProtectedAction) return;
    if (!(await isMatchingLocalPin(actionLockPin, actionLockSettings))) {
      toast.error("الرمز غير صحيح. لم تُنفّذ أي عملية.");
      return;
    }
    const action = pendingProtectedAction.action;
    setPendingProtectedAction(null);
    setActionLockPin("");
    action();
  };

  const saveActionLock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const pin = String(data.get("pin") || "");
    const confirmation = String(data.get("confirmation") || "");
    if (!isValidLocalPin(pin) || pin !== confirmation) {
      toast.error("اختر رمزًا رقميًا من 4 إلى 8 أرقام واكتبه متطابقًا.");
      return;
    }
    const salt = makeLocalLockSalt();
    setActionLockSettings({ enabled: true, salt, pinHash: await hashLocalPin(pin, salt) });
    event.currentTarget.reset();
    toast.success("تم تفعيل القفل المحلي للعمليات الحساسة.");
  };

  const disableActionLock = () => {
    if (!window.confirm("سيُلغى القفل المحلي من هذا الجهاز فقط. هل تريد المتابعة؟")) return;
    setActionLockSettings(emptyLocalActionLockSettings);
    toast.success("تم إيقاف القفل المحلي.");
  };

  const deleteCashExpense = (expense: CashExpense) => {
    runSensitiveAction("حذف مصروف نقدي", () => {
      if (!window.confirm(`سيُحذف مصروف «${expense.category}» بقيمة ${money(expense.amount)} من سجل الصندوق. هل تريد المتابعة؟`)) return;
      setStore((current) => ({ ...current, cashExpenses: current.cashExpenses.filter((entry) => entry.id !== expense.id) }));
      toast.success("تم حذف المصروف وتحديث صافي تشغيل اليوم.");
    });
  };

  const deleteCashClosing = (closing: CashClosing) => {
    runSensitiveAction("إلغاء إغلاق وردية", () => {
      if (!window.confirm(`سيُلغى إغلاق وردية ${closing.date} ويعود السجل إلى حالة غير مغلقة. هل تريد المتابعة؟`)) return;
      setStore((current) => ({ ...current, cashClosings: current.cashClosings.filter((entry) => entry.id !== closing.id) }));
      toast.success("تم إلغاء إغلاق الوردية محليًا.");
    });
  };

  const completeSale = () => {
    if (!cart.length) {
      toast.error("أضف صنفًا واحدًا على الأقل إلى السلة.");
      return;
    }
    const expiredCartItem = cart.find((item) => getExpiryStatus(store.products.find((product) => product.id === item.id)?.expiryDate).kind === "expired");
    if (expiredCartItem) {
      toast.error(`أزل «${expiredCartItem.name}» من السلة لأن صلاحيته انتهت.`);
      return;
    }
    if (paymentMethod === "credit" && !customerName.trim()) {
      toast.error("اكتب اسم الزبون لتسجيل الذمة.");
      return;
    }
    if (paymentMethod === "credit" && customerCreditStatus?.blocked) {
      toast.error(`لا يمكن إتمام البيع الآجل: السقف ${money(customerCreditStatus.limit ?? 0)} والرصيد المتوقع ${money(customerCreditStatus.projected)}.`);
      return;
    }
    const sale: Sale = {
      id: makeId("sale"),
      createdAt: new Date().toISOString(),
      items: cart.map((item) => ({ productId: item.id, name: item.name, quantity: item.cartQuantity, price: item.salePrice, cost: item.purchasePrice })),
      total: cartTotal,
      profit: cartProfit,
      subtotal: cartSubtotal,
      discountPercent: cartDiscountPercent,
      discountAmount: cartDiscountAmount,
      quantityOfferDiscountAmount: quantityOfferSummary.discountAmount,
      paymentMethod,
      customerName: paymentMethod === "credit" ? customerName.trim() : undefined,
      customerPhone: paymentMethod === "credit" ? customerPhone.trim() || undefined : undefined,
      customerCategoryId: selectedCustomerCategory?.id || undefined,
      customerCategoryName: selectedCustomerCategory?.name || undefined,
      staffMemberId: selectedStaffMember?.id || undefined,
      staffMemberName: selectedStaffMember?.name || undefined,
      note: saleNote.trim().slice(0, 240) || undefined,
      orderReference: saleOrderReference.trim().slice(0, 80) || undefined,
    };
    setStore((current) => ({
      ...current,
      sales: [sale, ...current.sales],
      products: current.products.map((product) => {
        const item = cart.find((candidate) => candidate.id === product.id);
        if (!item) return product;
        const batchConsumption = consumeBatchesFefo(product.batches ?? [], item.cartQuantity);
        return { ...product, quantity: product.quantity - item.cartQuantity, batches: batchConsumption.batches, expiryDate: getEarliestActiveExpiry(batchConsumption.batches) || product.expiryDate };
      }),
      debts: paymentMethod === "credit" ? [{ id: makeId("debt"), customerName: customerName.trim(), customerPhone: customerPhone.trim() || undefined, amount: cartTotal, paid: 0, createdAt: sale.createdAt, dueDate: "", note: `فاتورة رقم ${sale.id.slice(-5)}` }, ...current.debts] : current.debts,
    }));
    setLatestSale(sale);
    resetSaleDraft();
    toast.success(paymentMethod === "credit" ? "تم حفظ البيع والذمة." : "تم تسجيل البيع بنجاح.");
  };

  useEffect(() => {
    if (page !== "sale") return;
    const handleSaleShortcut = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      const isTyping = Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        saleSearchInputRef.current?.focus();
        return;
      }
      if (isTyping || !event.altKey) return;
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        setShowBarcodeScanner(true);
      }
      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        suspendCurrentSale();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        completeSale();
      }
    };
    window.addEventListener("keydown", handleSaleShortcut);
    return () => window.removeEventListener("keydown", handleSaleShortcut);
  }, [cart.length, completeSale, page, suspendCurrentSale]);

  const openSaleReturn = (sale: Sale) => {
    const eligibility = getSaleReturnEligibility(sale, store.sales, store.debts);
    if (!eligibility.allowed) {
      toast.info(eligibility.reason);
      return;
    }
    setReturnQuantities(Object.fromEntries(getSaleReturnableItems(sale, store.sales).map((item) => [item.productId, "0"])));
    setReturnCartReason("");
    setShowReturnReasonPicker(true);
    setReturnCartSale(sale);
  };

  const updateReturnCartQuantity = (productId: string, change: number) => {
    const remainingQuantity = returnCartAvailableItems.find((item) => item.productId === productId)?.remainingQuantity ?? 0;
    setReturnQuantities((current) => ({ ...current, [productId]: String(clampReturnCartQuantity(Number(current[productId]) || 0, change, remainingQuantity)) }));
  };

  const commitSaleReturn = (sale: Sale, selectedItems: Sale["items"], reason: string) => {
    const returnedAt = new Date().toISOString();
    const originalGross = sale.items.reduce((total, item) => total + item.quantity * item.price, 0);
    const returnedGross = selectedItems.reduce((total, item) => total + item.quantity * item.price, 0);
    const returnedCost = selectedItems.reduce((total, item) => total + item.quantity * item.cost, 0);
    const allocatedDiscount = originalGross > 0 ? Math.max(0, (sale.discountAmount ?? 0) * (returnedGross / originalGross)) : 0;
    const returnedTotal = Math.max(0, returnedGross - allocatedDiscount);
    const returnSale: Sale = { ...sale, id: makeId("sale-return"), createdAt: returnedAt, items: selectedItems.map((item) => ({ ...item, quantity: -item.quantity })), total: -returnedTotal, profit: -(returnedTotal - returnedCost), subtotal: -returnedGross, discountAmount: -allocatedDiscount, isReturn: true, returnOfSaleId: sale.id, returnReason: reason };
    setStore((current) => ({
      ...current,
      sales: [returnSale, ...current.sales],
      products: current.products.map((product) => {
        const returnedItem = selectedItems.find((item) => item.productId === product.id);
        if (!returnedItem) return product;
        const batches = [...(product.batches ?? []), { id: makeId("sale-return-batch"), receivedAt: returnedAt, quantity: returnedItem.quantity, remainingQuantity: returnedItem.quantity, purchasePrice: Math.max(0, returnedItem.cost), expiryDate: product.expiryDate || "", supplierName: "إرجاع بيع", note: `إرجاع جزئي للفاتورة ${sale.id.slice(-5)}: ${reason}` }];
        return { ...product, quantity: product.quantity + returnedItem.quantity, batches, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate };
      }),
      debts: sale.paymentMethod === "credit" ? current.debts.map((debt) => (debt.note || "").includes(sale.id.slice(-5)) ? { ...debt, amount: Math.max(0, debt.amount - returnedTotal), note: `${debt.note} · إرجاع ${money(returnedTotal)}` } : debt) : current.debts,
    }));
    setReturningSale(null);
    setReturnQuantities({});
    toast.success(`تم تسجيل إرجاع ${selectedItems.reduce((total, item) => total + item.quantity, 0)} وحدة وإعادة المخزون محليًا.`);
  };

  const submitSaleReturn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!returningSale) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    const eligibility = getSaleReturnEligibility(returningSale, store.sales, store.debts);
    const returnableItems = getSaleReturnableItems(returningSale, store.sales);
    const returnableByProductId = new Map(returnableItems.map((item) => [item.productId, item.remainingQuantity]));
    const selectedItems = returningSale.items.flatMap((item) => {
      const quantity = Number(returnQuantities[item.productId]);
      const remainingQuantity = returnableByProductId.get(item.productId) ?? 0;
      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0 || quantity > remainingQuantity) return [];
      return quantity > 0 ? [{ ...item, quantity }] : [];
    });
    const hasInvalidQuantity = returningSale.items.some((item) => {
      const quantity = Number(returnQuantities[item.productId]);
      const remainingQuantity = returnableByProductId.get(item.productId) ?? 0;
      return !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0 || quantity > remainingQuantity;
    });
    const expiredItem = selectedItems.find((item) => getExpiryStatus(store.products.find((product) => product.id === item.productId)?.expiryDate).kind === "expired");
    if (!eligibility.allowed) {
      toast.error(eligibility.reason);
      setReturningSale(null);
      setReturnQuantities({});
      return;
    }
    if (!reason) {
      toast.error("اكتب سبب إرجاع البيع لحفظه في السجل.");
      return;
    }
    if (hasInvalidQuantity) {
      toast.error("اختر كمية صحيحة لا تتجاوز المتبقي من كل صنف.");
      return;
    }
    if (!selectedItems.length) {
      toast.error("اختر صنفًا واحدًا وكمية واحدة على الأقل للإرجاع.");
      return;
    }
    if (expiredItem) {
      toast.error("لا يمكن إعادة صنف منتهي الصلاحية إلى المخزون. عالجه من سجل الهدر.");
      return;
    }
    runSensitiveAction("اعتماد إرجاع بيع جزئي", () => commitSaleReturn(returningSale, selectedItems, reason));
  };

  const commitReturnCart = () => {
    if (!returnCartSale) return;
    const eligibility = getSaleReturnEligibility(returnCartSale, store.sales, store.debts);
    const reason = returnCartReason.trim();
    const expiredItem = returnCartItems.find((item) => getExpiryStatus(store.products.find((product) => product.id === item.productId)?.expiryDate).kind === "expired");
    if (!eligibility.allowed) {
      toast.error(eligibility.reason);
      setReturnCartSale(null);
      setReturnQuantities({});
      return;
    }
    if (!reason) {
      toast.error("اكتب سبب الإرجاع لحفظه في السجل.");
      return;
    }
    if (!returnCartItems.length) {
      toast.error("أضف صنفًا واحدًا وكمية واحدة على الأقل إلى سلة الإرجاع.");
      return;
    }
    if (expiredItem) {
      toast.error("لا يمكن إعادة صنف منتهي الصلاحية إلى المخزون. عالجه من سجل الهدر.");
      return;
    }
    runSensitiveAction("اعتماد سلة إرجاع", () => {
      commitSaleReturn(returnCartSale, returnCartItems, reason);
      setReturnCartSale(null);
      setReturnCartReason("");
    });
  };

  const saveProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const savedAt = new Date().toISOString();
    const quantityOfferMinimumRaw = String(data.get("quantityOfferMinimum") || "").trim();
    const quantityOfferDiscountRaw = String(data.get("quantityOfferDiscount") || "").trim();
    const quantityOfferStartDate = String(data.get("quantityOfferStartDate") || "").trim();
    const quantityOfferEndDate = String(data.get("quantityOfferEndDate") || "").trim();
    const quantityOfferMinimum = Number(quantityOfferMinimumRaw);
    const quantityOfferDiscount = Number(quantityOfferDiscountRaw);
    if ((quantityOfferMinimumRaw || quantityOfferDiscountRaw) && (!Number.isInteger(quantityOfferMinimum) || quantityOfferMinimum < 1 || !Number.isFinite(quantityOfferDiscount) || quantityOfferDiscount <= 0 || quantityOfferDiscount > 100)) {
      toast.error("أدخل حد عرض كمية صحيحًا وخصمًا بين 0.01% و100%، أو اترك الحقلين فارغين.");
      return;
    }
    if ((quantityOfferStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(quantityOfferStartDate)) || (quantityOfferEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(quantityOfferEndDate)) || (quantityOfferStartDate && quantityOfferEndDate && quantityOfferEndDate < quantityOfferStartDate)) {
      toast.error("تحقق من تواريخ العرض: يجب ألا يسبق تاريخ النهاية تاريخ البداية.");
      return;
    }
    const product: Product = {
      id: editingProduct?.id ?? makeId("product"),
      name: String(data.get("name") || "").trim(),
      sku: String(data.get("sku") || "").trim() || `S-${Date.now().toString().slice(-4)}`,
      category: String(data.get("category") || "عام").trim(),
      imageDataUrl: isLocalProductImage(pendingProductImage) ? pendingProductImage : undefined,
      quantity: Number(data.get("quantity")),
      lowStockAt: Number(data.get("lowStockAt")),
      purchasePrice: Number(data.get("purchasePrice")),
      salePrice: Number(data.get("salePrice")),
      supplierName: String(data.get("supplierName") || "").trim(),
      expiryDate: String(data.get("expiryDate") || "").trim(),
      quantityOffers: quantityOfferMinimumRaw || quantityOfferDiscountRaw ? [{ minimumQuantity: quantityOfferMinimum, discountPercent: quantityOfferDiscount, startDate: quantityOfferStartDate || undefined, endDate: quantityOfferEndDate || undefined }] : [],
    };
    if (!product.name || [product.quantity, product.lowStockAt, product.purchasePrice, product.salePrice].some(Number.isNaN)) {
      toast.error("أكمل بيانات الصنف المطلوبة.");
      return;
    }
    const addingFirstProduct = store.products.length === 0 && !editingProduct;
    setStore((current) => {
      const existingProduct = editingProduct ? current.products.find((item) => item.id === editingProduct.id) : undefined;
      const openingBatches = existingProduct?.batches?.length ? existingProduct.batches : existingProduct?.quantity ? [{ id: makeId("batch"), receivedAt: savedAt, quantity: existingProduct.quantity, remainingQuantity: existingProduct.quantity, purchasePrice: existingProduct.purchasePrice, expiryDate: existingProduct.expiryDate || "", supplierName: existingProduct.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي موثق عند تعديل الصنف" }] : [];
      const batches = existingProduct ? reconcileBatchStocktake(openingBatches, product.quantity, savedAt, product.purchasePrice) : product.quantity > 0 ? [{ id: makeId("batch"), receivedAt: savedAt, quantity: product.quantity, remainingQuantity: product.quantity, purchasePrice: product.purchasePrice, expiryDate: product.expiryDate || "", supplierName: product.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي عند إضافة الصنف" }] : [];
      const normalizedProduct = { ...product, batches, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate };
      const priceChanges = buildPriceChangeDrafts(editingProduct, normalizedProduct).map((change) => ({
        id: makeId("price"),
        productId: normalizedProduct.id,
        productName: normalizedProduct.name,
        ...change,
        createdAt: new Date().toISOString(),
      }));
      return {
        ...current,
        products: editingProduct ? current.products.map((item) => item.id === editingProduct.id ? normalizedProduct : item) : [normalizedProduct, ...current.products],
        priceHistory: priceChanges.length ? [...priceChanges, ...current.priceHistory] : current.priceHistory,
        initialized: true,
      };
    });
    setShowProductForm(false);
    setEditingProduct(null);
    setPendingBarcode("");
    setPendingProductImage("");
    if (addingFirstProduct) setPage("sale");
    toast.success(editingProduct ? "تم حفظ تعديلات الصنف." : addingFirstProduct ? "تم حفظ أول صنف حقيقي. يمكنك الآن بدء البيع." : "تمت إضافة الصنف إلى المخزون.");
  };

  const openProductForm = (product?: Product) => {
    setEditingProduct(product ?? null);
    setPendingBarcode("");
    setPendingProductImage(product?.imageDataUrl ?? "");
    setShowProductForm(true);
  };

  const deleteProduct = (product: Product) => {
    runSensitiveAction("حذف صنف من المخزون", () => {
      if (!window.confirm(`سيُحذف «${product.name}» من المخزون الحالي فقط. ستبقى كل الفواتير السابقة كما هي. هل تريد المتابعة؟`)) return;
      setStore((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }));
      setCart((current) => current.filter((item) => item.id !== product.id));
      toast.success("تم حذف الصنف من المخزون الحالي مع الاحتفاظ بسجل الفواتير.");
    });
  };

  const addInventoryQuantity = (product: Product) => {
    setReceivingProduct(product);
    toast.info("سجّل الكمية كدفعة مستلمة للحفاظ على المورد والصلاحية وسجل الاستلام.");
  };

  const receiveSupplierBatch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!receivingProduct) return;
    const data = new FormData(event.currentTarget);
    const quantity = Number(data.get("quantity"));
    const purchasePrice = Number(data.get("purchasePrice"));
    const supplierName = String(data.get("supplierName") || "").trim();
    const expiryDate = String(data.get("expiryDate") || "").trim();
    const purchaseInvoiceRef = String(data.get("purchaseInvoiceRef") || "").trim().slice(0, 100);
    const note = String(data.get("note") || "").trim();
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
      toast.error("أدخل كمية مستلمة وسعر شراء صحيحين.");
      return;
    }
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      toast.error("أدخل تاريخ صلاحية صحيحًا أو اتركه فارغًا.");
      return;
    }
    const batch: ProductBatch = { id: makeId("batch"), receivedAt: new Date().toISOString(), quantity, remainingQuantity: quantity, purchasePrice, expiryDate, supplierName, purchaseInvoiceRef, note };
    setStore((current) => ({
      ...current,
      products: current.products.map((product) => {
        if (product.id !== receivingProduct.id) return product;
        const batches = [...(product.batches ?? []), batch];
        return { ...product, quantity: product.quantity + quantity, purchasePrice, supplierName: supplierName || product.supplierName, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate, batches };
      }),
    }));
    setReceivingProduct(null);
    toast.success(`تم استلام دفعة ${quantity} وحدة وتسجيلها في سجل المورد.`);
  };

  const submitStocktake = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stocktakeProduct) return;
    const actualQuantity = Number(stocktakeQuantity);
    if (!Number.isFinite(actualQuantity) || actualQuantity < 0) {
      toast.error("أدخل كمية فعلية صحيحة تساوي صفرًا أو أكثر.");
      return;
    }
    const difference = getStocktakeDifference(stocktakeProduct.quantity, actualQuantity);
    const recordedAt = new Date().toISOString();
    const stocktakeRecord = createStocktakeRecord({ id: makeId("stocktake"), productId: stocktakeProduct.id, productName: stocktakeProduct.name, sku: stocktakeProduct.sku, recordedQuantity: stocktakeProduct.quantity, actualQuantity, purchasePrice: stocktakeProduct.purchasePrice, recordedAt, note: "جرد دوري" });
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== stocktakeProduct.id) return product;
      const batches = product.batches?.length ? reconcileBatchStocktake(product.batches, actualQuantity, recordedAt, product.purchasePrice) : product.batches;
      return { ...product, quantity: actualQuantity, batches, expiryDate: batches?.length ? getEarliestActiveExpiry(batches) || product.expiryDate : product.expiryDate };
    }), stocktakeRecords: [stocktakeRecord, ...current.stocktakeRecords] }));
    setStocktakeProduct(null);
    setStocktakeQuantity("");
    toast.success(difference === 0 ? "تم تأكيد الجرد؛ الكمية مطابقة للمخزون." : `تم تحديث الكمية بعد الجرد: ${difference > 0 ? "+" : ""}${difference} وحدة.`);
  };

  const openBulkStocktake = () => {
    if (!store.products.length) {
      toast.info("أضف صنفًا واحدًا على الأقل قبل بدء الجرد الجماعي.");
      return;
    }
    setBulkStocktakeQuantities(Object.fromEntries(store.products.map((product) => [product.id, String(product.quantity)])));
    setShowBulkStocktake(true);
  };

  const commitBulkStocktake = (note: string, entries: Array<Product & { actualQuantity: number }>) => {
    const recordedAt = new Date().toISOString();
    const runId = makeId("bulk-stocktake");
    const records = createBulkStocktakeRecords(entries.map((entry) => ({ productId: entry.id, productName: entry.name, sku: entry.sku, recordedQuantity: entry.quantity, actualQuantity: entry.actualQuantity, purchasePrice: entry.purchasePrice })), runId, recordedAt, note);
    const summary = getBulkStocktakeSummary(records);
    const actualByProductId = new Map(records.map((record) => [record.productId, record.actualQuantity]));
    setStore((current) => ({
      ...current,
      products: current.products.map((product) => {
        const actualQuantity = actualByProductId.get(product.id);
        if (actualQuantity === undefined) return product;
        const batches = product.batches?.length ? reconcileBatchStocktake(product.batches, actualQuantity, recordedAt, product.purchasePrice) : product.batches;
        return { ...product, quantity: actualQuantity, batches, expiryDate: batches?.length ? getEarliestActiveExpiry(batches) || product.expiryDate : product.expiryDate };
      }),
      stocktakeRecords: [...records, ...current.stocktakeRecords],
    }));
    setStocktakeSettings((current) => ({ ...current, lastCompletedAt: recordedAt }));
    setShowBulkStocktake(false);
    setBulkStocktakeQuantities({});
    toast.success(`تم اعتماد الجرد الجماعي: ${summary.reviewedProducts} أصناف، ${summary.adjustedProducts} فروقات.`);
  };

  const submitBulkStocktake = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = String(data.get("note") || "جرد جماعي").trim() || "جرد جماعي";
    const entries = store.products.map((product) => ({ ...product, actualQuantity: Number(bulkStocktakeQuantities[product.id]) }));
    if (entries.some((entry) => !Number.isFinite(entry.actualQuantity) || entry.actualQuantity < 0 || !Number.isInteger(entry.actualQuantity))) {
      toast.error("أدخل كمية فعلية صحيحة لكل صنف قبل اعتماد الجرد.");
      return;
    }
    runSensitiveAction("اعتماد الجرد الجماعي", () => commitBulkStocktake(note, entries));
  };

  const exportBarcodeStocktakeExcel = async () => {
    const draft = store.barcodeStocktakeDraft;
    if (!draft) {
      toast.info("ابدأ جولة جرد بالباركود أولًا لتصدير ملخصها.");
      return;
    }
    const XLSX = await import("xlsx");
    const rows = barcodeStocktakeProgress.entries.map((entry) => ({
      "الصنف": entry.name,
      "الباركود": entry.sku,
      "التصنيف": entry.category || "غير مصنف",
      "المسجل": entry.quantity,
      "المعدود": entry.actualQuantity ?? "لم يعد",
      "الفارق": entry.difference ?? "—",
      "قيمة الفارق": entry.valueDifference === null ? "—" : entry.valueDifference,
      "الحالة": entry.counted ? (entry.difference === 0 ? "مطابق" : "فرق يحتاج مراجعة") : "لم يعد",
    }));
    const summary = [{
      "ملاحظة الجولة": draft.note,
      "بدأت": draft.createdAt,
      "آخر تحديث": draft.updatedAt,
      "أصناف معدودة": barcodeStocktakeProgress.countedProducts,
      "أصناف غير معدودة": barcodeStocktakeProgress.uncountedProducts,
      "وحدات مسجلة بالمسح/الإدخال": barcodeStocktakeProgress.scannedUnits,
      "فروقات تحتاج مراجعة": barcodeStocktakeProgress.differences,
    }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "جولة الباركود");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "ملخص الجولة");
    XLSX.writeFile(workbook, `souqna-barcode-stocktake-${todayKey()}.xlsx`);
    toast.success("تم تنزيل ملخص جولة الجرد بالباركود محليًا.");
  };

  const commitBarcodeStocktake = () => {
    const draft = store.barcodeStocktakeDraft;
    if (!draft) return;
    if (!barcodeStocktakeProgress.completed) {
      toast.error(`تبقى ${barcodeStocktakeProgress.uncountedProducts} أصناف دون عدّ. اكتب 0 للأصناف غير الموجودة أو أكمل جردها قبل الاعتماد.`);
      return;
    }
    const entries = barcodeStocktakeProgress.entries.map((entry) => ({ ...entry, actualQuantity: entry.actualQuantity ?? 0 }));
    runSensitiveAction("اعتماد جرد الباركود", () => {
      const recordedAt = new Date().toISOString();
      const runId = makeId("barcode-stocktake");
      const records = createBulkStocktakeRecords(entries.map((entry) => ({ productId: entry.id, productName: entry.name, sku: entry.sku, recordedQuantity: entry.quantity, actualQuantity: entry.actualQuantity, purchasePrice: entry.purchasePrice })), runId, recordedAt, draft.note);
      const summary = getBulkStocktakeSummary(records);
      const actualByProductId = new Map(records.map((record) => [record.productId, record.actualQuantity]));
      setStore((current) => ({
        ...current,
        products: current.products.map((product) => {
          const actualQuantity = actualByProductId.get(product.id);
          if (actualQuantity === undefined) return product;
          const batches = product.batches?.length ? reconcileBatchStocktake(product.batches, actualQuantity, recordedAt, product.purchasePrice) : product.batches;
          return { ...product, quantity: actualQuantity, batches, expiryDate: batches?.length ? getEarliestActiveExpiry(batches) || product.expiryDate : product.expiryDate };
        }),
        stocktakeRecords: [...records, ...current.stocktakeRecords],
        barcodeStocktakeDraft: null,
      }));
      setStocktakeSettings((current) => ({ ...current, lastCompletedAt: recordedAt }));
      setShowBarcodeStocktake(false);
      setShowBarcodeStocktakeScanner(false);
      toast.success(`تم اعتماد جولة الباركود: ${summary.reviewedProducts} أصناف، ${summary.adjustedProducts} فروقات.`);
    });
  };

  const completeWeeklyStocktake = () => {
    setStocktakeSettings((current) => ({ ...current, lastCompletedAt: new Date().toISOString() }));
    toast.success("تم اعتماد جرد هذا الأسبوع على هذا الجهاز.");
  };

  const finishStoreSetup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const storeName = String(data.get("storeName") || "").trim();
    if (!storeName) {
      toast.error("اكتب اسم محلك للبدء.");
      return;
    }
    setStore((current) => ({ ...current, storeName, initialized: true }));
    setShowStoreSetup(false);
    setShowProductForm(true);
    toast.success("تم حفظ بيانات المحل. أضف الآن أول صنف من مخزونك.");
  };

  const uploadReceiptLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة للشعار.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maximumSide = 420;
        const scale = Math.min(1, maximumSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          toast.error("تعذر تجهيز صورة الشعار.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setStore((current) => ({ ...current, receiptLogo: canvas.toDataURL("image/png") }));
        toast.success("تم حفظ شعار محلك للإيصالات.");
      };
      image.onerror = () => toast.error("تعذر قراءة صورة الشعار.");
      image.src = String(reader.result);
    };
    reader.onerror = () => toast.error("تعذر رفع الشعار.");
    reader.readAsDataURL(file);
  };

  const uploadProductImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة للصنف من الكاميرا أو المعرض.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maximumSide = 520;
        const scale = Math.min(1, maximumSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          toast.error("تعذر تجهيز صورة الصنف.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPendingProductImage(canvas.toDataURL("image/jpeg", 0.84));
        toast.success("تمت إضافة صورة الصنف محليًا.");
      };
      image.onerror = () => toast.error("تعذر قراءة صورة الصنف.");
      image.src = String(reader.result);
    };
    reader.onerror = () => toast.error("تعذر رفع صورة الصنف.");
    reader.readAsDataURL(file);
  };

  const addDebt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const customer = String(data.get("customer") || "").trim();
    if (!customer || !amount) {
      toast.error("اكتب اسم الزبون والمبلغ.");
      return;
    }
    setStore((current) => ({ ...current, debts: [{ id: makeId("debt"), customerName: customer, customerPhone: String(data.get("customerPhone") || "").trim() || undefined, amount, paid: 0, createdAt: new Date().toISOString(), dueDate: String(data.get("dueDate") || ""), note: String(data.get("note") || "") }, ...current.debts] }));
    setShowDebtForm(false);
    toast.success("تمت إضافة الذمة إلى الدفتر.");
  };

  const collectDebt = (debt: Debt) => {
    const outstanding = Math.max(0, debt.amount - debt.paid);
    setCollectionDebt(debt);
    setCollectionAmount(outstanding.toFixed(2));
  };

  const submitDebtCollection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!collectionDebt) return;
    const outstanding = Math.max(0, collectionDebt.amount - collectionDebt.paid);
    const value = Number(collectionAmount);
    if (!value || value <= 0) {
      toast.error("أدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }
    const collection: DebtCollection = { id: makeId("debt-collection"), debtId: collectionDebt.id, customerName: collectionDebt.customerName, amount: Math.min(outstanding, value), collectedAt: new Date().toISOString(), note: "تحصيل ذمة" };
    setStore((current) => ({ ...current, debts: current.debts.map((item) => item.id === collectionDebt.id ? { ...item, paid: Math.min(item.amount, item.paid + value) } : item), debtCollections: [...current.debtCollections, collection] }));
    const settlesDebt = value >= outstanding;
    setCollectionDebt(null);
    setCollectionAmount("");
    toast.success(settlesDebt ? "تم تحصيل الذمة بالكامل ونقلها إلى الأرشيف وصندوق اليوم." : "تم تسجيل الدفعة ضمن الذمة وصندوق اليوم.");
  };

  const reverseDebtCollection = (collection: DebtCollection) => {
    if (!window.confirm(`سيُعكس تحصيل ${money(collection.amount)} من ${collection.customerName} ويعود المبلغ إلى الذمة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({
      ...current,
      debts: current.debts.map((debt) => debt.id === collection.debtId ? { ...debt, paid: Math.max(0, debt.paid - collection.amount) } : debt),
      debtCollections: current.debtCollections.filter((entry) => entry.id !== collection.id),
    }));
    toast.success("تم عكس التحصيل وإعادة الذمة إلى رصيدها السابق.");
  };

  const openDebtReminder = (debt: Debt) => {
    if (!debt.customerPhone) {
      toast.info("أضف رقم هاتف الزبون أولًا لفتح تذكير واتساب يدوي.");
      return;
    }
    const remaining = Math.max(0, debt.amount - debt.paid);
    window.open(buildDebtReminderUrl({ phone: debt.customerPhone, customerName: debt.customerName, remaining, storeName: store.storeName }), "_blank", "noopener,noreferrer");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `souqna-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const exportedAt = new Date().toISOString();
    localStorage.setItem(BACKUP_EXPORTED_AT_KEY, exportedAt);
    setLastBackupAt(exportedAt);
    toast.success("تم تنزيل نسخة احتياطية من بياناتك.");
  };

  const exportReportsExcel = async () => {
    const XLSX = await import("xlsx");
    const monthRevenue = monthSales.reduce((total, sale) => total + sale.total, 0);
    const monthProfit = monthSales.reduce((total, sale) => total + sale.profit, 0);
    const summary = [
      { "المؤشر": "مبيعات اليوم", "القيمة (د.ل)": salesTodayTotal },
      { "المؤشر": "ربح اليوم", "القيمة (د.ل)": profitToday },
      { "المؤشر": "تحصيل ذمم اليوم", "القيمة (د.ل)": todayCashSummary.debtCollections },
      { "المؤشر": "مصروفات اليوم", "القيمة (د.ل)": todayCashSummary.expenses },
      { "المؤشر": "مبيعات الشهر", "القيمة (د.ل)": monthRevenue },
      { "المؤشر": "ربح الشهر", "القيمة (د.ل)": monthProfit },
      { "المؤشر": "الذمم المستحقة", "القيمة (د.ل)": totalOutstanding },
      { "المؤشر": "قيمة المخزون بسعر الشراء", "القيمة (د.ل)": store.products.reduce((total, product) => total + product.quantity * product.purchasePrice, 0) },
    ];
    const salesRows = store.sales.flatMap((sale) => sale.items.map((item) => ({ "رقم الفاتورة": sale.id.slice(-5), "مرجع الطلب": sale.orderReference ?? "", "التاريخ": sale.createdAt, "طريقة الدفع": sale.paymentMethod === "cash" ? "نقدًا" : "آجل", "الزبون": sale.customerName ?? "", "ملاحظة الفاتورة": sale.note ?? "", "الصنف": item.name, "الكمية": item.quantity, "سعر الوحدة": item.price, "الإجمالي": item.price * item.quantity, "الربح": (item.price - item.cost) * item.quantity })));
    const productRows = store.products.map((product) => ({ "اسم الصنف": product.name, "رمز الصنف": product.sku, "التصنيف": product.category, "الكمية": product.quantity, "حد التنبيه": product.lowStockAt, "سعر الشراء": product.purchasePrice, "سعر البيع": product.salePrice }));
    const debtRows = store.debts.map((debt) => ({ "الزبون": debt.customerName, "إجمالي الذمة": debt.amount, "المدفوع": debt.paid, "المتبقي": Math.max(0, debt.amount - debt.paid), "تاريخ الاستحقاق": debt.dueDate, "ملاحظة": debt.note }));
    const collectionRows = store.debtCollections.map((collection) => ({ "الزبون": collection.customerName, "المبلغ المحصل": collection.amount, "تاريخ التحصيل": collection.collectedAt, "ملاحظة": collection.note }));
    const workbook = XLSX.utils.book_new();
    const reportSheets: Array<[string, Record<string, unknown>[]]> = [["ملخص", summary], ["الفواتير", salesRows], ["المخزون", productRows], ["الذمم", debtRows], ["تحصيل الذمم", collectionRows]];
    reportSheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name));
    XLSX.writeFile(workbook, `souqna-report-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير Excel شامل للمبيعات والمخزون والذمم.");
  };

  const exportWeeklyReportExcel = async () => {
    const XLSX = await import("xlsx");
    const weeklySales = store.sales.filter((sale) => new Date(sale.createdAt) >= new Date(weeklySummary.startAt));
    const summaryRows = [
      { "المؤشر": "بداية الأسبوع", "القيمة": formatDate(weeklySummary.startAt) },
      { "المؤشر": "نهاية الأسبوع", "القيمة": formatDate(weeklySummary.endAt) },
      { "المؤشر": "عدد الفواتير", "القيمة": weeklySummary.invoices },
      { "المؤشر": "المبيعات", "القيمة": weeklySummary.revenue },
      { "المؤشر": "الأرباح", "القيمة": weeklySummary.profit },
    ];
    const saleRows = weeklySales.map((sale) => ({ "رقم الفاتورة": sale.id.slice(-5), "التاريخ": sale.createdAt, "الطريقة": sale.paymentMethod === "cash" ? "نقدًا" : "آجل", "الإجمالي": sale.total, "الربح": sale.profit }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "ملخص أسبوعي");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saleRows), "فواتير الأسبوع");
    XLSX.writeFile(workbook, `souqna-weekly-profit-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير الأرباح الأسبوعي.");
  };

  const exportMonthlyReportExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = [
      { "المؤشر": "بداية الشهر", "القيمة": formatDate(monthlySummary.startAt) },
      { "المؤشر": "نهاية التقرير", "القيمة": formatDate(monthlySummary.endAt) },
      { "المؤشر": "عدد الفواتير", "القيمة": monthlySummary.invoices },
      { "المؤشر": "الوحدات المباعة", "القيمة": monthlySummary.units },
      { "المؤشر": "المبيعات", "القيمة": monthlySummary.revenue },
      { "المؤشر": "الأرباح", "القيمة": monthlySummary.profit },
      { "المؤشر": "متوسط الفاتورة", "القيمة": monthlySummary.averageInvoice },
      { "المؤشر": "أصناف بلا حركة (30 يومًا)", "القيمة": inactiveProducts.length },
    ];
    const invoiceRows = monthlySummary.sales.map((sale) => ({ "رقم الفاتورة": sale.id.slice(-5), "التاريخ": sale.createdAt, "الطريقة": sale.paymentMethod === "cash" ? "نقدًا" : "آجل", "الزبون": sale.customerName ?? "", "الإجمالي": sale.total, "الربح": sale.profit }));
    const productRows = monthlySummary.products.map((product) => ({ "الصنف": product.name, "الوحدات المباعة": product.quantity, "الإيراد": product.revenue, "الربح": product.profit }));
    const inactiveRows = inactiveProducts.map(({ product, lastSoldAt }) => ({ "الصنف": product.name, "الرمز": product.sku, "المتوفر": product.quantity, "آخر بيع": lastSoldAt || "لم يسجل بيع" }));
    const workbook = XLSX.utils.book_new();
    const reportSheets: Array<[string, Record<string, unknown>[]]> = [["ملخص شهري", summaryRows], ["فواتير الشهر", invoiceRows], ["أداء الأصناف", productRows], ["أصناف بلا حركة", inactiveRows]];
    reportSheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name));
    XLSX.writeFile(workbook, `souqna-monthly-report-${todayKey()}.xlsx`);
    toast.success("تم تنزيل التقرير الشهري المفصل.");
  };

  const exportMonthlyExpensesExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = monthlyExpenseReport.groups.map((group) => ({ "التصنيف": group.category, "عدد المصروفات": group.count, "إجمالي المصروفات": group.amount }));
    const detailRows = monthlyExpenseReport.groups.flatMap((group) => group.expenses.map((expense) => ({ "التصنيف": group.category, "المبلغ": expense.amount, "التاريخ": expense.spentAt, "الملاحظة": expense.note || "" })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ "ملاحظة": "لا توجد مصروفات مسجلة لهذا الشهر" }]), "حسب التصنيف");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ "ملاحظة": "لا توجد تفاصيل مصروفات" }]), "تفاصيل المصروفات");
    XLSX.writeFile(workbook, `souqna-monthly-expenses-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير مصروفات الشهر.");
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      const validation = validateStoreBackup(parsed);
      if (!validation.valid) {
        toast.error(validation.reason);
        return;
      }
      if (!window.confirm(`سيتم استبدال بيانات هذا الجهاز بنسخة «${validation.summary.storeName}» التي تحتوي على ${validation.summary.products} صنف و${validation.summary.sales} فاتورة. هل تريد المتابعة؟`)) return;
      const imported = parsed as StoreData;
      setStore(normalizeStore({ ...imported, initialized: true }));
      setCart([]);
      toast.success("تم استيراد النسخة الاحتياطية بنجاح.");
    } catch {
      toast.error("تعذّر قراءة الملف. اختر نسخة احتياطية من سوقنا.");
    }
  };

  const installOnDevice = async () => {
    if (!installPrompt) {
      toast.message("من قائمة Chrome على أندرويد اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") toast.success("تمت إضافة سوقنا إلى هاتفك.");
    setInstallPrompt(null);
  };

  const downloadExcelTemplate = async () => {
    const XLSX = await import("xlsx");
    const templateRows = [{ "اسم الصنف": "", "رمز الصنف": "", "التصنيف": "عام", "المورد": "", "تاريخ الصلاحية": "", "الكمية": 0, "حد التنبيه": 5, "سعر الشراء": 0, "سعر البيع": 0 }];
    const sheet = XLSX.utils.json_to_sheet(templateRows);
    sheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "الأصناف");
    XLSX.writeFile(workbook, "souqna-products-template.xlsx");
    toast.success("تم تنزيل قالب الأصناف. املأ الصفوف ثم استورد الملف.");
  };

  const importExcelProducts = async (file?: File) => {
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("لا توجد ورقة");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (!rows.length) throw new Error("لا توجد صفوف");
      const received = new Map<string, Omit<Product, "id">>();
      let rejected = 0;
      rows.forEach((row) => {
        const name = excelText(pickColumn(row, ["اسم الصنف", "الاسم", "name", "Name"]));
        const sku = excelText(pickColumn(row, ["رمز الصنف", "الباركود", "SKU", "sku", "Barcode", "barcode"]));
        const category = excelText(pickColumn(row, ["التصنيف", "الفئة", "category", "Category"])) || "عام";
        const supplierName = excelText(pickColumn(row, ["المورد", "اسم المورد", "supplier", "Supplier"]));
        const expiryDate = excelText(pickColumn(row, ["تاريخ الصلاحية", "تاريخ الانتهاء", "expiryDate", "Expiry Date", "expiry"]));
        const quantity = excelNumber(pickColumn(row, ["الكمية", "quantity", "Quantity"]));
        const lowStockAt = excelNumber(pickColumn(row, ["حد التنبيه", "الحد الأدنى", "lowStockAt", "Low Stock", "low stock"]));
        const purchasePrice = excelNumber(pickColumn(row, ["سعر الشراء", "purchasePrice", "Purchase Price", "cost"]));
        const salePrice = excelNumber(pickColumn(row, ["سعر البيع", "salePrice", "Sale Price", "price"]));
        if (!name || !sku || [quantity, lowStockAt, purchasePrice, salePrice].some((value) => !Number.isFinite(value) || value < 0)) { rejected += 1; return; }
        received.set(sku.toLowerCase(), { name, sku, category, supplierName, expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ? expiryDate : "", quantity, lowStockAt, purchasePrice, salePrice });
      });
      const items = Array.from(received.values());
      if (!items.length) throw new Error("كل الصفوف غير صالحة");
      const importedAt = new Date().toISOString();
      let updated = 0;
      setStore((current) => {
        const bySku = new Map(current.products.map((product) => [product.sku.toLowerCase(), product]));
        const products = [...current.products];
        const priceHistory: PriceHistoryEntry[] = [];
        items.forEach((item) => {
          const key = item.sku.toLowerCase();
          const currentProduct = bySku.get(key);
          if (currentProduct) {
            const index = products.findIndex((product) => product.id === currentProduct.id);
            const openingBatches = currentProduct.batches?.length ? currentProduct.batches : currentProduct.quantity ? [{ id: makeId("batch"), receivedAt: importedAt, quantity: currentProduct.quantity, remainingQuantity: currentProduct.quantity, purchasePrice: currentProduct.purchasePrice, expiryDate: currentProduct.expiryDate || "", supplierName: currentProduct.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي موثق عند استيراد Excel" }] : [];
            const batches = reconcileBatchStocktake(openingBatches, item.quantity, importedAt, item.purchasePrice);
            const nextProduct = { ...currentProduct, ...item, batches, expiryDate: getEarliestActiveExpiry(batches) || item.expiryDate };
            products[index] = nextProduct;
            buildPriceChangeDrafts(currentProduct, nextProduct).forEach((change) => priceHistory.push({ id: makeId("price"), productId: currentProduct.id, productName: nextProduct.name, ...change, createdAt: new Date().toISOString() }));
            updated += 1;
          } else {
            const batches = item.quantity > 0 ? [{ id: makeId("batch"), receivedAt: importedAt, quantity: item.quantity, remainingQuantity: item.quantity, purchasePrice: item.purchasePrice, expiryDate: item.expiryDate || "", supplierName: item.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي عند استيراد Excel" }] : [];
            products.unshift({ id: makeId("product"), ...item, batches, expiryDate: getEarliestActiveExpiry(batches) || item.expiryDate });
          }
        });
        return { ...current, products, priceHistory: priceHistory.length ? [...priceHistory, ...current.priceHistory] : current.priceHistory, initialized: true };
      });
      const added = items.length - updated;
      toast.success(`تمت معالجة ${items.length} صنف: ${added} مضاف و${updated} محدّث${rejected ? ` · ${rejected} صف تم تجاوزه` : ""}.`);
      if (rejected) toast.info("تأكد من الأعمدة المطلوبة: اسم الصنف، رمز الصنف، الكمية، حد التنبيه، سعر الشراء، سعر البيع.");
    } catch {
      toast.error("تعذّر قراءة Excel. نزّل القالب واستخدم ورقة الأصناف الأولى.");
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const resetData = () => {
    if (!window.confirm("سيتم حذف جميع أصنافك ومبيعاتك وذممك من هذا الجهاز، ثم يبدأ إعداد محل جديد. هل تريد المتابعة؟")) return;
    setStore(emptyStoreData);
    setCart([]);
    setReadNotificationKeys([]);
    setShowStoreSetup(true);
    toast.success("تم حذف البيانات. أعد الآن تجهيز محلك ببياناتك الحقيقية.");
  };

  const pageTitle: Record<Page, string> = { dashboard: "لوحة اليوم", sale: "بيع جديد", inventory: "إدارة المخزون", debts: "دفتر الذمم", reports: "تقارير المتجر", settings: "الإعدادات" };

  if (!dataReady) {
    return <div className="app-loading" dir="rtl"><img src={logoUrl} alt="سوقنا" /><strong>نجهّز بيانات محلك بأمان…</strong><span>يتم فتح قاعدة البيانات المحلية على هذا الجهاز.</span></div>;
  }

  return (
    <div className="souqna-app" dir="rtl">
      <aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><img src={logoUrl} alt="رمز سوقنا" /></div>
          <div><strong>سوقنا</strong><span>دفتر تشغيل محلك</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="إغلاق القائمة"><X size={19} /></button>
        </div>

        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <p className="nav-label">إدارة المتجر</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActivePage(id)} className={`nav-item ${page === id ? "nav-item--active" : ""}`}>
              <Icon size={19} /><span>{label}</span>{id === "debts" && totalOutstanding > 0 && <b>{store.debts.filter((debt) => debt.amount > debt.paid).length}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={() => setActivePage("settings")} className={`nav-item ${page === "settings" ? "nav-item--active" : ""}`}><Settings size={19} /><span>الإعدادات</span></button>
          <div className="offline-note"><WifiOff size={16} /><span>بياناتك محفوظة على هذا الجهاز</span></div>
        </div>
      </aside>

      {mobileNav && <button aria-label="إغلاق القائمة" className="sidebar-backdrop" onClick={() => setMobileNav(false)} />}

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar__title">
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="فتح القائمة"><Menu size={23} /></button>
            <div className="topbar-ledger-mark" aria-hidden="true"><img src={logoUrl} alt="" /><div><b>سوقنا</b><span>دفتر<br/>التشغيل</span></div></div>
            <div><p>مرحبًا بك في {store.storeName}</p><h1>{pageTitle[page]}</h1></div>
          </div>
          <div className="topbar__tools">
            <span className={`connection-pill ${isOnline ? "" : "connection-pill--offline"}`}>{isOnline ? <Check size={14} /> : <WifiOff size={14} />}{isOnline ? "جاهز للعمل دون إنترنت" : "وضع العمل المحلي"}</span>
            <div className="notification-wrapper">
              <button className={`notification-trigger ${unreadNotificationCount ? "notification-trigger--active" : ""}`} onClick={() => setNotificationsOpen((open) => !open)} aria-label={`الإشعارات، ${unreadNotificationCount} غير مقروءة`} aria-expanded={notificationsOpen}>
                <BellRing size={19} />
                {unreadNotificationCount > 0 && <b>{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</b>}
              </button>
              {notificationsOpen && <section className="notification-popover" role="dialog" aria-label="مركز الإشعارات">
                <div className="notification-popover__head"><div><span className="section-kicker">مركز المتابعة</span><h3>إشعارات محلك</h3></div>{unreadNotificationCount > 0 && <button className="text-button" onClick={markAllNotificationsRead}>تعليم الكل كمقروء</button>}</div>
                <div className="notification-popover__list">
                  {notifications.length ? notifications.map((notification) => {
                    const read = readNotificationKeys.includes(notification.id);
                    const Icon = notification.kind === "info" ? WalletCards : CircleAlert;
                    return <button key={notification.id} className={`notification-item notification-item--${notification.kind} ${read ? "notification-item--read" : ""}`} onClick={() => openNotification(notification)}><span className="notification-item__icon"><Icon size={17} /></span><span className="notification-item__copy"><strong>{notification.title}</strong><small>{notification.description}</small></span>{!read && <i aria-label="غير مقروء" />}</button>;
                  }) : <div className="notification-empty"><Check size={20} /><p>كل شيء تحت السيطرة الآن.</p><small>لا توجد تنبيهات ضمن الإعدادات المفعلة.</small></div>}
                </div>
                <div className="notification-popover__foot"><Settings size={14} /> <button onClick={() => { setActivePage("settings"); setNotificationsOpen(false); }}>تخصيص الإشعارات</button></div>
              </section>}
            </div>
            <button className="action-button action-button--primary action-button--new-sale" onClick={openSale}><Plus size={19} /> بيعة جديدة</button>
          </div>
        </header>

        <div className="page-content">
          {page === "dashboard" && (
            <section className="dashboard-page">
              <div className="ledger-ribbon" aria-label="مؤشر دفتر التشغيل اليومي">
                <div className="ledger-ribbon__stamp"><img src={logoUrl} alt="" /><span><b>دفتر اليوم</b><small>تشغيل محلك خطوة بخطوة</small></span></div>
                <div className="ledger-ribbon__date"><CalendarDays size={16} /><span>سجل اليوم</span><b>{new Intl.DateTimeFormat("ar-LY", { day: "2-digit", month: "short" }).format(new Date())}</b></div>
                <div className="ledger-ribbon__status"><i /><span>{store.products.length ? "المحل جاهز للبيع" : "أضف أول صنف"}</span><small>{store.products.length ? "المبيعات محفوظة محليًا" : "لا توجد بيانات تجريبية"}</small></div>
              </div>
              <div className="dashboard-greeting" style={{ backgroundImage: `linear-gradient(90deg, rgba(247,241,229,.98) 37%, rgba(247,241,229,.72) 67%, rgba(247,241,229,.34)), url(${receiptPatternUrl})` }}>
                <div className="greeting-copy">
                  <span className="eyebrow"><CalendarDays size={15} /> {new Intl.DateTimeFormat("ar-LY", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
                  <h2>{store.products.length ? <>يوم منظم يبدأ من <em>محلك.</em></> : <>ابدأ ببيانات <em>محلك الحقيقية.</em></>}</h2>
                  <p>{store.products.length ? "تابع مبيعاتك ومخزونك وذممك من شاشة واحدة، حتى عندما ينقطع الإنترنت." : "لا توجد أي أصناف أو فواتير تجريبية هنا. أضف أول صنف من مخزونك الفعلي لتبدأ التشغيل."}</p>
                  <button className="action-button action-button--primary" onClick={store.products.length ? openSale : () => openProductForm()}>{store.products.length ? <ShoppingBag size={18} /> : <PackagePlus size={18} />}{store.products.length ? "تسجيل بيع" : "إضافة أول صنف"}</button>
                </div>
                <div className="greeting-stamp"><span>سوقنا</span><small>محلك في يدك</small></div>
              </div>

              <div className="stat-grid">
                <StatCard label="مبيعات اليوم" value={money(salesTodayTotal)} detail={`${todaySales.length} فاتورة مسجلة`} icon={CircleDollarSign} tone="olive" />
                <StatCard label="ربح اليوم" value={money(profitToday)} detail="بعد تكلفة الأصناف" icon={TrendingUp} tone="blue" />
                <StatCard label="صافي تشغيل اليوم" value={money(todayCashSummary.netOperatingProfit)} detail={`${todayExpenses.length} مصروفات مسجلة`} icon={WalletCards} tone="apricot" />
                <StatCard label="ذمم مستحقة" value={money(totalOutstanding)} detail={`${store.debts.filter((debt) => debt.amount > debt.paid).length} زبون بانتظار السداد`} icon={WalletCards} tone="apricot" />
                <StatCard label="تنبيهات المخزون" value={`${lowStock.length} أصناف`} detail={lowStock.length ? "تحتاج متابعة الآن" : "المخزون في وضع جيد"} icon={BellRing} tone="sand" />
              </div>

              <section className="panel weekly-report-strip"><div><span className="section-kicker">هدف مبيعات اليوم</span><h3>{dailyGoalProgress.active ? (dailyGoalProgress.met ? "تم تحقيق الهدف" : `${dailyGoalProgress.achievement.toFixed(0)}% من الهدف`) : "ضع هدفًا واضحًا لليوم"}</h3><p>{dailyGoalProgress.active ? `المبيعات ${money(dailyGoalProgress.revenue)} من هدف ${money(dailyGoalProgress.target)} · المتبقي ${money(dailyGoalProgress.remaining)}.` : "حدد رقمًا اختياريًا لتتابع تقدم المبيعات خلال اليوم على هذا الجهاز."}</p></div><div className="inventory-page__actions">{dailyGoalProgress.active && <span className={`status-badge ${dailyGoalProgress.met ? "" : "status-badge--warning"}`}>{dailyGoalProgress.met ? "متحقق" : `${dailyGoalProgress.achievement.toFixed(0)}%`}</span>}<button className="action-button action-button--secondary" onClick={() => setShowDailyGoalForm(true)}><TrendingUp size={17} /> {dailyGoalProgress.active ? "تعديل الهدف" : "ضبط الهدف"}</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">هدف مبيعات الشهر</span><h3>{monthlyGoalProgress.active ? (monthlyGoalProgress.met ? "تم تحقيق هدف الشهر" : `${monthlyGoalProgress.achievement.toFixed(0)}% من هدف الشهر`) : "ضع هدفًا للشهر"}</h3><p>{monthlyGoalProgress.active ? `مبيعات الشهر ${money(monthlyGoalProgress.revenue)} من هدف ${money(monthlyGoalProgress.target)} · المتبقي ${money(monthlyGoalProgress.remaining)}.` : "ضع هدفًا شهريًا اختياريًا لمتابعة نمو المحل من لوحة اليوم."}</p></div><div className="inventory-page__actions">{monthlyGoalProgress.active && <span className={`status-badge ${monthlyGoalProgress.met ? "" : "status-badge--warning"}`}>{monthlyGoalProgress.met ? "متحقق" : `${monthlyGoalProgress.achievement.toFixed(0)}%`}</span>}<button className="action-button action-button--secondary" onClick={() => setShowMonthlyGoalForm(true)}><CalendarDays size={17} /> {monthlyGoalProgress.active ? "تعديل الهدف" : "ضبط الهدف"}</button></div></section>

              <div className="dashboard-columns">
                <section className="panel panel--sales-flow"><div className="panel-heading"><div><span className="section-kicker">صندوق اليوم</span><h3>{todayCashClosing ? "إغلاق الوردية معتمد" : "أغلق ورديتك بدقة"}</h3></div><button className="text-button" onClick={() => setActivePage("reports")}>إدارة الصندوق <ChevronLeft size={16} /></button></div><div className="financial-stack"><div><span>نقد متوقع</span><b dir="ltr">{money(todayCashSummary.expectedCash)}</b></div><div><span>مصروفات اليوم</span><b dir="ltr">{money(todayCashSummary.expenses)}</b></div><div className="financial-stack__profit"><span>{todayCashClosing ? "فارق الإغلاق" : "صافي تشغيل اليوم"}</span><b dir="ltr">{money(todayCashClosing ? Math.abs(todayCashSummary.variance ?? 0) : todayCashSummary.netOperatingProfit)}</b></div></div></section>
                <section className="panel panel--sales-flow">
                  <div className="panel-heading"><div><span className="section-kicker">سجل اليوم</span><h3>آخر الحركات</h3></div><button className="text-button" onClick={() => setActivePage("reports")}>كل التقارير <ChevronLeft size={16} /></button></div>
                  {todaySales.length ? (
                    <div className="activity-list">
                      {todaySales.slice(0, 5).map((sale) => <div className="activity-row" key={sale.id}><span className="activity-icon"><ReceiptText size={18} /></span><div><strong>فاتورة #{sale.id.slice(-5)}</strong><small>{formatDate(sale.createdAt)} · {sale.items.length} أصناف</small></div><b dir="ltr">{money(sale.total)}</b><button className="mini-icon" onClick={() => void downloadReceiptPdf(sale)} aria-label="تنزيل الفاتورة PDF"><Download size={16} /></button><button className="mini-icon" onClick={() => printReceipt(sale)} aria-label="طباعة الفاتورة"><Printer size={16} /></button></div>)}
                    </div>
                  ) : <EmptyState icon={ReceiptText} title="لا توجد مبيعات مسجلة اليوم" description="ابدأ أول بيعة، وسيتولى سوقنا حساب الإجمالي والربح." action={<button className="text-button text-button--strong" onClick={() => setActivePage("sale")}>فتح شاشة البيع <ArrowLeft size={16} /></button>} />}
                </section>

                <section className="panel panel--low-stock">
                  <div className="panel-heading"><div><span className="section-kicker">المخزون</span><h3>محتاج متابعة</h3></div><button className="text-button" onClick={() => setActivePage("inventory")}>عرض المخزون <ChevronLeft size={16} /></button></div>
                  {lowStock.length ? <div className="stock-alerts">{lowStock.map((product) => <div className="stock-alert" key={product.id}><div><strong>{product.name}</strong><small>الحد الأدنى: {product.lowStockAt} وحدات</small></div><b>{product.quantity}</b><span>وحدات</span></div>)}</div> : <EmptyState icon={store.products.length ? Check : Archive} title={store.products.length ? "كل الأصناف مطمئنة" : "لا يوجد مخزون بعد"} description={store.products.length ? "لا توجد أصناف تجاوزت حد إعادة الطلب." : "أضف أصناف مخزون محلك الفعلية، وستظهر التنبيهات هنا تلقائيًا."} action={!store.products.length ? <button className="text-button text-button--strong" onClick={() => openProductForm()}>إضافة أول صنف <ArrowLeft size={16} /></button> : undefined} />}
                </section>
              </div>
            </section>
          )}

          {page === "sale" && (
            <section className="sale-page">
              <div className="sale-header" style={{ backgroundImage: `linear-gradient(90deg, rgba(248,244,235,.98) 0%, rgba(248,244,235,.73) 58%, rgba(248,244,235,.16)), url(${counterImageUrl})` }}>
                <div><span className="eyebrow"><ShoppingBag size={15} /> نقطة البيع</span><h2>سجل البيع بسرعة، <em>والحساب علينا.</em></h2><p>اختر الأصناف ثم أكد البيع. المخزون والأرباح يتحدثان تلقائيًا.</p></div>
                <div className="sale-header__tip"><ClipboardList size={20} /><span>اضغط على الصنف لإضافته<br/>مباشرة إلى السلة</span></div>
              </div>
              <div className="pos-layout">
                <section className="product-browser panel">
                  <div className="panel-heading panel-heading--stack"><div><span className="section-kicker">الأصناف المتاحة</span><h3>اختيار سريع</h3></div><div className="pos-quick-actions"><button onClick={() => setShowBarcodeScanner(true)} className="text-button text-button--strong"><Camera size={16} /> مسح باركود</button><button onClick={() => openProductForm()} className="text-button text-button--strong"><PackagePlus size={16} /> إضافة صنف</button></div></div>
	                  <div className="sale-search-row"><label className="search-box"><Search size={18} /><input ref={saleSearchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الباركود..." /></label><select aria-label="تصفية أصناف البيع حسب الفئة" value={saleCategoryFilter} onChange={(event) => setSaleCategoryFilter(event.target.value)}><option value="">كل الفئات</option>{saleCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select><button className="scan-button" onClick={() => setShowBarcodeScanner(true)} aria-label="مسح باركود بالكاميرا"><Camera size={18} /></button></div>
	                  {favoriteSaleProducts.length > 0 && <section className="price-history-panel"><div className="panel-heading"><div><span className="section-kicker">مفضلة البيع</span><h3>اختصاراتك المحلية</h3></div><span className="status-badge">{favoriteSaleProducts.length} أصناف</span></div><div className="product-grid">{favoriteSaleProducts.map((product) => <div key={`favorite-${product.id}`} style={{ position: "relative" }}><button className="product-tile" onClick={() => addToCart(product)}><span className="product-tile__category">مفضل</span><strong>{product.name}</strong><div><b dir="ltr">{money(product.salePrice)}</b><small>{product.quantity} متوفر</small></div></button><button className="mini-icon mini-icon--danger" style={{ position: "absolute", top: 8, left: 8 }} onClick={() => toggleFavoriteProduct(product.id)} aria-label={`إزالة ${product.name} من المفضلة`}><Star size={14} fill="currentColor" /></button></div>)}</div></section>}
	                  <div className="product-grid">
	                    {filteredSaleProducts.map((product) => <div key={product.id} style={{ position: "relative" }}><button className="product-tile" onClick={() => addToCart(product)}>{product.imageDataUrl && <img className="product-tile__image" src={product.imageDataUrl} alt="" />}<span className="product-tile__category">{product.category}</span><strong>{product.name}</strong><div><b dir="ltr">{money(product.salePrice)}</b><small>{product.quantity} متوفر</small></div><span className={`stock-dot ${product.quantity <= product.lowStockAt ? "stock-dot--low" : ""}`} /></button><button className="mini-icon" style={{ position: "absolute", top: 8, left: 8 }} onClick={() => toggleFavoriteProduct(product.id)} aria-label={store.favoriteProductIds.includes(product.id) ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} إلى المفضلة`}><Star size={14} fill={store.favoriteProductIds.includes(product.id) ? "currentColor" : "none"} /></button></div>)}
                  </div>
                  {!filteredSaleProducts.length && <EmptyState icon={Box} title={store.products.length ? "لا توجد أصناف مطابقة" : "لم تضف أصنافًا بعد"} description={store.products.length ? "جرّب بحثًا مختلفًا أو أضف صنفًا جديدًا." : "أضف أصناف مخزونك الحقيقي قبل إنشاء أي فاتورة."} action={!store.products.length ? <button className="text-button text-button--strong" onClick={() => openProductForm()}>إضافة أول صنف <ArrowLeft size={16} /></button> : undefined} />}
                </section>

	                <aside className="cart-panel">
	                  <div className="cart-panel__head"><div><span className="section-kicker">الفاتورة الحالية</span><h3>سلة البيع</h3></div><span className="cart-count">{cart.reduce((count, item) => count + item.cartQuantity, 0)}</span></div>
	                  {store.suspendedSaleDrafts.length > 0 && <div className="price-history-list">{store.suspendedSaleDrafts.slice(0, 4).map((draft) => <div className="price-history-row" key={draft.id}><span><strong>{draft.label}</strong><small>{draft.items.reduce((count, item) => count + item.quantity, 0)} وحدات · {formatDate(draft.createdAt)}</small></span><div className="row-actions"><button className="mini-icon" onClick={() => resumeSuspendedSale(draft)} aria-label={`استئناف ${draft.label}`}><ShoppingBag size={14} /></button><button className="mini-icon mini-icon--danger" onClick={() => deleteSuspendedSale(draft)} aria-label={`حذف ${draft.label}`}><Trash2 size={14} /></button></div></div>)}</div>}
                  <div className="cart-items">
                    {cart.length ? cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item__info"><strong>{item.name}</strong><small dir="ltr">{money(item.salePrice)} للوحدة</small></div><div className="quantity-controls"><button onClick={() => changeCartQuantity(item.id, -1)} aria-label="تقليل الكمية"><Minus size={15} /></button><b>{item.cartQuantity}</b><button onClick={() => changeCartQuantity(item.id, 1)} aria-label="زيادة الكمية"><Plus size={15} /></button></div><b className="cart-item__total" dir="ltr">{money(item.salePrice * item.cartQuantity)}</b><button className="mini-icon mini-icon--danger" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))} aria-label="إزالة الصنف"><Trash2 size={15} /></button></div>) : <EmptyState icon={ShoppingBag} title="السلة فارغة" description="اختر الأصناف من القائمة لإضافتها إلى هذه الفاتورة." />}
                  </div>
	                  <div className="payment-method"><p>طريقة الدفع</p><div><button className={paymentMethod === "cash" ? "selected" : ""} onClick={() => setPaymentMethod("cash")}><CircleDollarSign size={17} /> نقدًا</button><button className={paymentMethod === "credit" ? "selected" : ""} onClick={() => setPaymentMethod("credit")}><UserRound size={17} /> آجل / ذمة</button></div><div className="customer-picker">{store.localStaff.length > 0 && <label className="customer-field"><span>الموظف (اختياري)</span><select value={selectedStaffMemberId} onChange={(event) => setSelectedStaffMemberId(event.target.value)}><option value="">بدون اسم موظف</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}{store.customerCategories.length > 0 && <label className="customer-field"><span>فئة الزبون</span><select value={selectedCustomerCategoryId} onChange={(event) => { const categoryId = event.target.value; setSelectedCustomerCategoryId(categoryId); setSaleDiscountPercent(String(store.customerCategories.find((category) => category.id === categoryId)?.discountPercent ?? store.defaultDiscountPercent)); }}><option value="">بدون فئة</option>{store.customerCategories.map((category) => <option key={category.id} value={category.id}>{category.name} · {category.discountPercent}%</option>)}</select></label>}<label className="customer-field"><span>خصم الفاتورة (%)</span><input value={saleDiscountPercent} inputMode="decimal" type="number" min="0" max="100" step="0.5" onChange={(event) => setSaleDiscountPercent(event.target.value)} placeholder="0" /></label>{selectedCustomerCategory && <small className="modal-note">تم تطبيق خصم فئة «{selectedCustomerCategory.name}» ويمكن تعديله لهذه الفاتورة فقط.</small>}{paymentMethod === "credit" && <><label className="customer-field"><UserRound size={16} /><input list="souqna-recurring-customers" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="اسم الزبون" /></label><label className="customer-field"><span>هاتف</span><input value={customerPhone} inputMode="tel" onChange={(event) => setCustomerPhone(event.target.value)} placeholder="هاتف الزبون (اختياري)" /></label>{customerCreditStatus?.limit !== null && <small className={`modal-note ${customerCreditStatus.blocked || customerCreditStatus.warning ? "low-number" : ""}`}>سقف الائتمان {money(customerCreditStatus.limit)} · الرصيد المتوقع {money(customerCreditStatus.projected)}{customerCreditStatus.blocked ? " · تجاوز السقف: لن يُعتمد البيع الآجل" : customerCreditStatus.warning ? " · اقتربت من السقف" : ""}</small>}<datalist id="souqna-recurring-customers">{recurringCustomers.map((customer) => <option key={customer.name} value={customer.name} />)}</datalist>{recurringCustomers.length > 0 && <div className="customer-chips"><small>زبائن متكررون</small><div>{recurringCustomers.slice(0, 5).map((customer) => <button type="button" key={customer.name} onClick={() => setCustomerName(customer.name)}>{customer.name}{customer.outstanding > 0 && <i>{money(customer.outstanding)}</i>}</button>)}</div></div>}</>}</div></div>
	                  <label className="customer-field"><span>ملاحظة الفاتورة (اختياري)</span><input value={saleNote} maxLength={240} onChange={(event) => setSaleNote(event.target.value)} placeholder="مثال: طلب توصيل أو ملاحظة للزبون" /></label>
	                  <label className="customer-field"><span>رقم طلب / مرجع (اختياري)</span><input value={saleOrderReference} maxLength={80} onChange={(event) => setSaleOrderReference(event.target.value)} placeholder="مثال: W-204 أو اسم الطلب" /></label>
	                  <div className="cart-total"><div><span>{cartDiscountAmount > 0 ? "الإجمالي بعد الخصم" : "الإجمالي"}</span>{quantityOfferSummary.discountAmount > 0 && <small>عرض كمية تلقائي: -{money(quantityOfferSummary.discountAmount)} · {quantityOfferSummary.applied.map((offer) => `${offer.productName} (${offer.discountPercent}%)`).join("، ")}</small>}{manualCartDiscountAmount > 0 && <small>{selectedCustomerCategory ? `خصم ${selectedCustomerCategory.name}` : "خصم الفاتورة"} {cartDiscountPercent}%: -{money(manualCartDiscountAmount)}</small>}<small>ربح متوقع: {money(cartProfit)}</small></div><strong dir="ltr">{money(cartTotal)}</strong></div>
	                  <div className="inventory-page__actions"><input value={suspendedSaleLabel} maxLength={60} onChange={(event) => setSuspendedSaleLabel(event.target.value)} placeholder="اسم السلة المعلقة (اختياري)" aria-label="اسم السلة المعلقة" /><button className="action-button action-button--secondary" disabled={!cart.length} onClick={suspendCurrentSale}><Archive size={16} /> تعليق السلة</button></div>
                  <button className="action-button action-button--checkout" disabled={!cart.length} onClick={completeSale}><Check size={19} /> تأكيد البيع</button>
	                  <p className="cart-footnote"><Printer size={14} /> بعد التأكيد يمكنك طباعة الفاتورة عبر طابعتك المرتبطة بالبلوتوث. على الكمبيوتر: Ctrl+F للبحث، Alt+B للمسح، Alt+H لتعليق السلة، Alt+Enter لتأكيد البيع.</p>
                </aside>
              </div>
              {latestSale && <div className="sale-success"><span><Check size={18} /></span><p>تم حفظ فاتورة بقيمة <b dir="ltr">{money(latestSale.total)}</b></p><button onClick={() => void downloadReceiptPdf(latestSale)}><Download size={16} /> تنزيل PDF</button><button onClick={() => printReceipt(latestSale)}><Printer size={16} /> طباعة الفاتورة</button><button className="sale-success__dismiss" onClick={() => setLatestSale(null)} aria-label="إخفاء"><X size={17} /></button></div>}
            </section>
          )}

          {page === "inventory" && (
            <section className="inventory-page">
              <div className="page-intro"><div><span className="eyebrow"><Archive size={15} /> إدارة المنتجات</span><h2>مخزونك، واضح <em>دائمًا.</em></h2><p>أضف أصنافك وحدد حد التنبيه لكل صنف؛ سيتابع سوقنا الكميات بعد كل بيع.</p></div><div className="inventory-page__actions"><input className="hidden-input" ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={(event) => void importExcelProducts(event.target.files?.[0])} /><button className="action-button action-button--primary" onClick={openBarcodeStocktake}><Camera size={17} /> جرد سريع بالباركود</button><button className="action-button action-button--secondary" onClick={openBulkStocktake}><ClipboardList size={17} /> جرد جماعي</button><button className="action-button action-button--secondary" onClick={() => setShowStocktakeScanner(true)}><Camera size={17} /> جرد صنف بالكاميرا</button><button className="action-button action-button--secondary" onClick={() => { setSelectedLabelProductIds(filteredInventory.map((product) => product.id)); setShowShelfLabels(true); }}><Printer size={17} /> ملصقات أسعار</button><button className="action-button action-button--secondary" onClick={() => void downloadExcelTemplate()}><FileText size={17} /> قالب Excel</button><button className="action-button action-button--secondary" onClick={() => excelInputRef.current?.click()}><Upload size={17} /> استيراد Excel</button><button className="action-button action-button--primary" onClick={() => openProductForm()}><PackagePlus size={18} /> إضافة صنف</button></div></div>
              <div className="inventory-summary"><div><span>إجمالي الأصناف</span><b>{store.products.length}</b></div><div><span>وحدات بالمخزون</span><b>{store.products.reduce((total, product) => total + product.quantity, 0)}</b></div><div><span>قيمة المخزون (شراء)</span><b dir="ltr">{money(store.products.reduce((total, product) => total + product.quantity * product.purchasePrice, 0))}</b></div><div className={lowStock.length ? "warning" : "safe"}><span>تحتاج إعادة طلب</span><b>{lowStock.length}</b></div><div className={expiringProducts.length ? "warning" : "safe"}><span>صلاحية قريبة أو منتهية</span><b>{expiringProducts.length}</b></div></div>
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">مواقع الرفوف</span><h3>{shelfLocations.length ? `${shelfLocations.length} مواقع محفوظة` : "نظّم الأصناف حسب موقعها"}</h3></div><span className="status-badge">اختياري ومحلي</span></div>{store.products.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>الموقع</th><th>الكمية</th></tr></thead><tbody>{[...store.products].sort((left, right) => (left.shelfLocation || "~").localeCompare(right.shelfLocation || "~", "ar") || left.name.localeCompare(right.name, "ar")).map((product) => <tr key={`shelf-${product.id}`}><td><strong>{product.name}</strong><small dir="ltr">{product.sku}</small></td><td><input aria-label={`موقع رف ${product.name}`} key={`${product.id}-${product.shelfLocation || ""}`} defaultValue={product.shelfLocation || ""} maxLength={50} placeholder="مثال: ر1 · رف 3" onBlur={(event) => updateProductShelfLocation(product.id, event.target.value)} /></td><td>{product.quantity}</td></tr>)}</tbody></table></div> : <p className="modal-note">أضف أصنافًا حقيقية أولًا ثم اكتب موقع كل صنف لتسهيل المرور أثناء الجرد.</p>}<p className="modal-note">اكتب رمزًا بسيطًا مثل «ر1 · رف 3». سيُستخدم الموقع في البحث والفرز داخل المخزون وجولة الجرد السريع.</p></section>
              {store.barcodeStocktakeDraft && <section className="panel weekly-report-strip"><div><span className="section-kicker">جولة الباركود محفوظة محليًا</span><h3>{barcodeStocktakeProgress.countedProducts} من {store.products.length} أصناف معدودة</h3><p>وحدات مسجلة {barcodeStocktakeProgress.scannedUnits} · غير معدودة {barcodeStocktakeProgress.uncountedProducts} · فروقات ظاهرة {barcodeStocktakeProgress.differences}. لا يتغير المخزون قبل اعتماد الجولة.</p></div><button className="action-button action-button--secondary" onClick={openBarcodeStocktake}><ClipboardList size={17} /> متابعة الجولة</button></section>}
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">جرد حسب الفئة</span><h3>{inventoryCategorySummary.length ? `${inventoryCategorySummary.length} فئات في المخزون` : "لا توجد فئات بعد"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportInventoryCategoriesExcel()}><Download size={16} /> فئات المخزون Excel</button></div>{inventoryCategorySummary.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الفئة</th><th>الأصناف</th><th>الوحدات</th><th>قيمة الشراء</th><th>قيمة البيع</th><th>تحت الحد</th></tr></thead><tbody>{inventoryCategorySummary.map((group) => <tr key={group.category}><td><strong>{group.category}</strong></td><td>{group.productCount}</td><td>{group.units}</td><td dir="ltr">{money(group.purchaseValue)}</td><td dir="ltr">{money(group.saleValue)}</td><td><span className={`status-badge ${group.lowStockCount ? "status-badge--warning" : ""}`}>{group.lowStockCount ? `${group.lowStockCount} أصناف` : "مطمئن"}</span></td></tr>)}</tbody></table></div> : <p className="modal-note">ستظهر الفئات بعد حفظ أصناف حقيقية مع تصنيفها.</p>}<p className="modal-note">القيمة تحسب من الكمية الحالية وسعر الشراء أو البيع المحفوظ لكل صنف على هذا الجهاز.</p></section>
              <section className="panel batch-inventory-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">استلام المورد والدفعات</span><h3>جرد الدفعات حسب أقرب صلاحية</h3></div><span className="status-badge">{expirySortedBatches.length} نشطة · {batchHistory.length} في السجل</span></div>{store.products.length ? <><div className="notification-settings">{store.products.map((product) => <button key={product.id} onClick={() => setReceivingProduct(product)}><span><strong>{product.name}</strong><small>{getActiveBatches(product.batches ?? []).length ? `${getActiveBatches(product.batches ?? []).length} دفعات · ${getBatchRemainingTotal(product.batches ?? [])} وحدة ضمن الدفعات` : "أضف أول دفعة موثقة"}</small></span><PackagePlus size={16} /></button>)}</div>{batchHistory.length ? <div className="price-history-list">{batchHistory.slice(0, 20).map(({ product, batch }) => { const expiry = getExpiryStatus(batch.expiryDate); const state = batch.wasteApproval ? "هدر معتمد" : batch.wasteRequest ? "بانتظار اعتماد ثانٍ" : batch.supplierReturn ? "مرجعة للمورد" : batch.remainingQuantity <= 0 ? "مستهلكة" : expiry.kind === "expired" ? "منتهية" : expiry.kind === "soon" ? "قريبة" : "نشطة"; const warning = state === "منتهية" || state === "قريبة" || state === "هدر معتمد" || state === "بانتظار اعتماد ثانٍ"; const editable = isBatchEditable(batch) && !batch.wasteRequest; const canReturn = editable && !batch.supplierReturn && !batch.wasteApproval; const canWaste = batch.remainingQuantity > 0 && expiry.kind === "expired" && !batch.wasteRequest && !batch.wasteApproval && !batch.supplierReturn; const canFinalApprove = Boolean(batch.wasteRequest && !batch.wasteApproval && !batch.supplierReturn && batch.remainingQuantity > 0); return <div className="price-history-row" key={batch.id}><span><strong>{product.name}</strong><small>{batch.supplierName || "بدون مورد"} · استلام {formatDate(batch.receivedAt)}{batch.note ? ` · ${batch.note}` : ""}</small></span><b>{batch.remainingQuantity} / {batch.quantity}</b><span className={`status-badge ${warning ? "status-badge--warning" : ""}`}>{state} · {batch.expiryDate || "بلا تاريخ صلاحية"}</span><div className="row-actions"><button className="mini-icon" onClick={() => printSupplierReceivingNotice(product, batch)} aria-label="طباعة إشعار الاستلام"><Printer size={14} /></button><button className="mini-icon" disabled={!batch.supplierReturn} onClick={() => printSupplierReturnNotice(product, batch)} aria-label="طباعة إشعار الإرجاع"><ReceiptText size={14} /></button><button className="mini-icon" disabled={!editable} onClick={() => setEditingBatch({ product, batch })} aria-label="تعديل الدفعة غير المستهلكة"><Pencil size={14} /></button><button className="mini-icon" disabled={!canWaste} onClick={() => setWasteApprovalBatch({ product, batch })} aria-label="طلب اعتماد هدر الدفعة المنتهية"><Archive size={14} /></button><button className="mini-icon" disabled={!canFinalApprove} onClick={() => setFinalWasteApprovalBatch({ product, batch })} aria-label="اعتماد هدر نهائي"><Check size={14} /></button><button className="mini-icon" disabled={!canReturn} onClick={() => setSupplierReturnBatch({ product, batch })} aria-label="إرجاع الدفعة إلى المورد"><ArrowLeft size={14} /></button><button className="mini-icon mini-icon--danger" disabled={!editable} onClick={() => cancelBatch(product, batch)} aria-label="إلغاء الدفعة غير المستهلكة"><Trash2 size={14} /></button></div></div>; })}</div> : <p className="modal-note">لم تسجل دفعات بعد؛ اختر أي صنف أعلاه لتوثيق أول استلام من المورد.</p>}</> : <EmptyState icon={Archive} title="أضف صنفًا أولًا" description="بعد إضافة الأصناف، ستتمكن من استلام دفعات الموردين وتتبع صلاحيتها." />}</section>
              {inactiveProducts.length > 0 && <section className="panel weekly-report-strip"><div><span className="section-kicker">متابعة الحركة</span><h3>{inactiveProducts.length} أصناف بلا حركة</h3><p>{inactiveProducts.slice(0, 3).map(({ product }) => product.name).join(" · ")}{inactiveProducts.length > 3 ? " · وغيرها" : ""}</p></div><button className="action-button action-button--secondary" onClick={() => setActivePage("reports")}><BarChart3 size={17} /> فتح التقرير الشهري</button></section>}
              <section className="panel weekly-report-strip"><div><span className="section-kicker">قائمة شراء محلية</span><h3>{supplierPurchaseList.length ? `${supplierPurchaseList.reduce((count, group) => count + group.products.length, 0)} أصناف تحتاج شراء` : "المخزون يغطي حد التنبيه"}</h3><p>{supplierPurchaseList.length ? supplierPurchaseList.map((group) => `${group.supplierName}: ${group.products.length}`).join(" · ") : "ستظهر هنا الأصناف المنخفضة مجمعة حسب المورد."}</p></div><button className="action-button action-button--secondary" onClick={printSupplierPurchaseList}><Printer size={17} /> طباعة قائمة المشتريات</button></section>
              <section className="weekly-report-strip"><div><span className="section-kicker">جرد أسبوعي محلي</span><h3>{stocktakeDue ? "موعد الجرد اليوم" : "موعد الجرد مضبوط"}</h3><p>{stocktakeDue ? "راجِع الأصناف ثم اعتمد جرد الأسبوع بعد الانتهاء." : stocktakeSettings.lastCompletedAt ? `آخر اعتماد: ${formatDate(stocktakeSettings.lastCompletedAt)}` : "سيظهر التذكير عند حلول اليوم المحدد."}</p></div><div className="inventory-page__actions"><label className="field"><span>يوم الجرد</span><select value={stocktakeSettings.weekday} onChange={(event) => setStocktakeSettings((current) => ({ ...current, weekday: Number(event.target.value) }))}><option value="0">الأحد</option><option value="1">الاثنين</option><option value="2">الثلاثاء</option><option value="3">الأربعاء</option><option value="4">الخميس</option><option value="5">الجمعة</option><option value="6">السبت</option></select></label><button className="action-button action-button--secondary" onClick={completeWeeklyStocktake}><Check size={17} /> اعتماد جرد الأسبوع</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مقارنة جولات الجرد</span><h3>{stocktakeRunComparison.current && stocktakeRunComparison.previous ? "آخر جولتين معتمدتين" : "تحتاج جولتين معتمدتين للمقارنة"}</h3><p>{stocktakeRunComparison.current && stocktakeRunComparison.previous ? `الأحدث: ${stocktakeRunComparison.current.products} أصناف · ${stocktakeRunComparison.current.adjustedProducts} فروقات. السابقة: ${stocktakeRunComparison.previous.products} أصناف · ${stocktakeRunComparison.previous.adjustedProducts} فروقات.` : "بعد اعتماد جولتي جرد، ستظهر مقارنة الفروقات وقيمتها تلقائيًا من السجلات المحلية."}</p></div>{stocktakeRunComparison.current && stocktakeRunComparison.previous ? <div className="inventory-page__actions"><span className={`status-badge ${stocktakeRunComparison.adjustedProductChange && stocktakeRunComparison.adjustedProductChange > 0 ? "status-badge--warning" : ""}`}>فرق الأصناف {stocktakeRunComparison.adjustedProductChange && stocktakeRunComparison.adjustedProductChange > 0 ? "+" : ""}{stocktakeRunComparison.adjustedProductChange}</span><span className={`status-badge ${stocktakeRunComparison.shortageValueChange && stocktakeRunComparison.shortageValueChange > 0 ? "status-badge--warning" : ""}`}>فرق العجز {money(stocktakeRunComparison.shortageValueChange ?? 0)}</span></div> : <span className="status-badge">محلي بالكامل</span>}</section>
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل فروقات الجرد</span><h3>{stocktakeRecordSummary.count ? `${stocktakeRecordSummary.count} تسويات محفوظة` : "لا توجد فروقات جرد محفوظة"}</h3></div><span className={`status-badge ${stocktakeRecordSummary.shortageUnits ? "status-badge--warning" : ""}`}>عجز {stocktakeRecordSummary.shortageUnits} · زيادة {stocktakeRecordSummary.surplusUnits}</span></div>{recentStocktakeRecords.length ? <div className="price-history-list">{recentStocktakeRecords.map((record) => <div className="price-history-row" key={record.id}><span><strong>{record.productName}</strong><small>{formatDate(record.recordedAt)} · مسجل {record.recordedQuantity} · فعلي {record.actualQuantity}</small></span><b dir="ltr">{record.difference > 0 ? "+" : ""}{record.difference} وحدة</b><span className={`status-badge ${record.difference < 0 ? "status-badge--warning" : ""}`}>{money(Math.abs(record.valueDifference))}</span></div>)}</div> : <p className="modal-note">نفّذ الجرد اليدوي أو بالكاميرا؛ سيُحفظ كل فرق مع قيمته بسعر الشراء داخل هذا السجل.</p>}</section>
              {shelfLocations.length > 0 && <section className="weekly-report-strip"><div><span className="section-kicker">مرور بحسب الرف</span><h3>{inventoryShelfFilter || "كل مواقع الرفوف"}</h3><p>تُرتّب قائمة الأصناف وجولة الباركود حسب الموقع المكتوب لكل صنف.</p></div><label className="field"><span>تصفية الموقع</span><select value={inventoryShelfFilter} onChange={(event) => setInventoryShelfFilter(event.target.value)}><option value="">كل المواقع</option>{shelfLocations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label></section>}
              <section className="panel inventory-table-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">قائمة الأصناف</span><h3>المخزون الحالي</h3></div><label className="search-box search-box--small"><Search size={17} /><input value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} placeholder="ابحث باسم أو رمز..." /></label></div>
                <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>الرمز</th><th>المتوفر</th><th>سعر الشراء</th><th>سعر البيع</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{filteredInventory.map((product) => { const low = product.quantity <= product.lowStockAt; const expiry = getExpiryStatus(product.expiryDate); return <tr key={product.id}><td><div className="product-cell">{product.imageDataUrl ? <img src={product.imageDataUrl} alt="" /> : <span>{product.name.slice(0, 1)}</span>}<div><strong>{product.name}</strong><small>{product.category}{product.supplierName ? ` · ${product.supplierName}` : ""}</small></div></div></td><td dir="ltr">{product.sku}</td><td><b className={low ? "low-number" : ""}>{product.quantity}</b><small> / حد {product.lowStockAt}</small></td><td dir="ltr">{money(product.purchasePrice)}</td><td dir="ltr">{money(product.salePrice)}</td><td><span className={`status-badge ${low || expiry.kind === "soon" || expiry.kind === "expired" ? "status-badge--warning" : ""}`}>{expiry.kind === "expired" ? "منتهي" : expiry.kind === "soon" ? `ينتهي ${product.expiryDate}` : low ? "منخفض" : "متوفر"}</span></td><td><div className="row-actions"><button className="mini-icon" onClick={() => addInventoryQuantity(product)} aria-label="إضافة كمية"><Plus size={16} /></button><button className="mini-icon" onClick={() => setPriceHistoryProductId(product.id)} aria-label="سجل الأسعار"><History size={15} /></button><button className="mini-icon" onClick={() => openProductForm(product)} aria-label="تعديل الصنف"><Pencil size={15} /></button><button className="mini-icon mini-icon--danger" onClick={() => deleteProduct(product)} aria-label="حذف الصنف"><Trash2 size={15} /></button></div></td></tr>})}</tbody></table></div>
                {!filteredInventory.length && <EmptyState icon={Archive} title="المخزون فارغ" description="أضف أول صنف لتبدأ متابعة منتجات محلك." />}
                {priceHistoryProductId && <section className="price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل الأسعار</span><h3>{store.products.find((product) => product.id === priceHistoryProductId)?.name || "صنف"}</h3></div><button className="text-button" onClick={() => setPriceHistoryProductId(null)}>إغلاق</button></div>{selectedProductPriceHistory.length ? <div className="price-history-list">{selectedProductPriceHistory.map((entry) => <div className="price-history-row" key={entry.id}><span>{entry.field === "purchasePrice" ? "سعر الشراء" : "سعر البيع"}</span><b dir="ltr">{money(entry.previous)}</b><ArrowLeft size={15} /><strong dir="ltr">{money(entry.next)}</strong><small>{formatDate(entry.createdAt)}</small></div>)}</div> : <EmptyState icon={History} title="لا توجد تغييرات مسجلة" description="سيظهر هنا كل تعديل لاحق على سعر الشراء أو البيع لهذا الصنف." />}</section>}
              </section>
            </section>
          )}

          {page === "debts" && (
            <section className="debts-page">
              <div className="page-intro"><div><span className="eyebrow"><WalletCards size={15} /> متابعة الزبائن</span><h2>دفتر الذمم، <em>من دون ورق.</em></h2><p>كل عملية آجلة تسجل تلقائيًا. أضف ذمة يدوية أو سجل دفعة عندما يسدد الزبون.</p></div><button className="action-button action-button--primary" onClick={() => setShowDebtForm(true)}><Plus size={18} /> إضافة ذمة</button></div>
              <div className="debt-overview"><div className="debt-overview__total"><span>إجمالي المبلغ المستحق</span><strong dir="ltr">{money(totalOutstanding)}</strong><small>لدى {store.debts.filter((debt) => debt.amount > debt.paid).length} زبون</small></div><div className="debt-overview__hint"><CircleAlert size={22} /><p>حافظ على التواصل: الذمة الواضحة تحمي علاقتك بالزبون وتساعدك على التخطيط للشراء.</p></div></div>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">كشف حساب الزبون</span><h3>{customerStatement ? customerStatement.customerName : "اختر زبونًا لمراجعة حركاته"}</h3><p>{customerStatement ? `فواتير آجل ${money(customerStatement.invoiced)} · إرجاعات ${money(customerStatement.returned)} · تحصيلات ${money(customerStatement.collected)} · الرصيد ${money(customerStatement.balance)}.` : "يجمع الفواتير الآجلة والتحصيلات والإرجاعات المحفوظة على هذا الجهاز."}</p></div><div className="inventory-page__actions"><select aria-label="اختيار زبون لكشف الحساب" value={customerStatementName} onChange={(event) => setCustomerStatementName(event.target.value)}><option value="">اختر زبونًا</option>{customerStatementNames.map((name) => <option key={name} value={name}>{name}</option>)}</select>{customerStatement && <label className="field"><span>سقف الائتمان (د.ل)</span><input key={customerStatement.customerName} type="number" inputMode="decimal" min="0" step="0.01" defaultValue={store.customerCreditLimits[customerStatement.customerName.trim().toLocaleLowerCase("ar")] ?? ""} placeholder="بلا سقف" onBlur={(event) => updateCustomerCreditLimit(customerStatement.customerName, event.target.value)} /></label>}<button className="action-button action-button--secondary" disabled={!customerStatement} onClick={printCustomerStatement}><Printer size={16} /> طباعة الكشف</button><button className="action-button action-button--secondary" disabled={!customerStatement} onClick={() => void exportCustomerStatementExcel()}><Download size={16} /> كشف Excel</button></div></section>
              {customerStatement && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">حركات {customerStatement.customerName}</span><h3>{customerStatement.entries.length ? `${customerStatement.entries.length} حركات محفوظة` : "لا توجد حركات"}</h3></div><span className="status-badge">الرصيد {money(customerStatement.balance)}</span></div>{customerStatement.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>التاريخ</th><th>العملية</th><th>المرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>{customerStatement.entries.map((entry) => <tr key={entry.id}><td>{formatDate(entry.occurredAt)}</td><td>{entry.type}</td><td>{entry.reference}<small>{entry.note}</small></td><td dir="ltr">{entry.debit ? money(entry.debit) : "—"}</td><td dir="ltr">{entry.credit ? money(entry.credit) : "—"}</td><td dir="ltr"><b>{money(entry.balance)}</b></td></tr>)}</tbody></table></div> : <p className="modal-note">لا توجد فواتير آجل أو تحصيلات أو إرجاعات مسجلة لهذا الزبون بعد.</p>}</section>}
              <section className="panel debt-list-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">سجل الذمم</span><h3>{showSettledDebts ? "أرشيف الذمم المسددة" : "المبالغ القائمة"}</h3></div><div className="debt-list-tools"><label className="search-box search-box--small"><Search size={17} /><input value={debtQuery} onChange={(event) => setDebtQuery(event.target.value)} placeholder="ابحث بالاسم أو الهاتف..." /></label><button className="action-button action-button--secondary debt-archive-toggle" onClick={() => setShowSettledDebts((current) => !current)}><Archive size={15} />{showSettledDebts ? `إظهار القائمة (${activeDebts.length})` : `الأرشيف (${settledDebts.length})`}</button><span className="status-badge">تحديث محلي فوري</span></div></div>{store.debts.length ? (showSettledDebts ? settledDebts : activeDebts).length ? <div className="debt-list">{(showSettledDebts ? settledDebts : activeDebts).map((debt) => { const remaining = Math.max(0, debt.amount - debt.paid); const settled = isSettledDebt(debt); return <div className={`debt-row ${settled ? "debt-row--settled" : ""}`} key={debt.id}><div className="debt-avatar">{debt.customerName.slice(0, 1)}</div><div className="debt-person"><strong>{debt.customerName}</strong><small>{debt.customerPhone ? `هاتف: ${debt.customerPhone} · ` : ""}{debt.note || `سجلت في ${formatDate(debt.createdAt)}`}{debt.dueDate ? ` · استحقاق ${debt.dueDate}` : ""}</small></div><div className="debt-amount"><span>المتبقي</span><b dir="ltr">{money(remaining)}</b><small>من {money(debt.amount)}</small></div><div className="debt-progress"><span><i style={{ width: `${Math.min(100, (debt.paid / debt.amount) * 100) || 0}%` }} /></span><small>تم تحصيل {money(debt.paid)}</small></div>{settled ? <span className="settled-label"><Check size={15} /> مسددة</span> : <div className="debt-row-actions"><button className="action-button action-button--secondary" onClick={() => collectDebt(debt)}>تسجيل دفعة</button>{debt.customerPhone && <button className="mini-icon mini-icon--whatsapp" onClick={() => openDebtReminder(debt)} aria-label="فتح تذكير واتساب يدوي"><MessageCircle size={16} /></button>}</div>}</div>})}</div> : <EmptyState icon={showSettledDebts ? Archive : Search} title={showSettledDebts ? "الأرشيف فارغ" : "لا توجد ذمم قائمة مطابقة"} description={showSettledDebts ? "ستظهر هنا الذمم بعد تحصيلها بالكامل." : "جرّب كتابة اسم الزبون أو رقم هاتفه دون مسافات إضافية."} /> : <EmptyState icon={WalletCards} title="دفتر الذمم فارغ" description="عند اختيار «آجل / ذمة» أثناء البيع، سيظهر سجل الزبون هنا تلقائيًا." action={<button className="text-button text-button--strong" onClick={() => setActivePage("sale")}>فتح شاشة البيع <ArrowLeft size={16} /></button>} />}</section>
            </section>
          )}

          {page === "reports" && (
            <section className="reports-page">
              <div className="page-intro"><div><span className="eyebrow"><BarChart3 size={15} /> أرقام واضحة</span><h2>اعرف كيف مضى <em>يوم محلك.</em></h2><p>تقارير مبنية من فواتيرك المحفوظة على هذا الجهاز، بلا إنترنت ولا تعقيد.</p></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> نسخة احتياطية</button><button className="action-button action-button--secondary" onClick={() => void exportLocalOperationsExcel()}><Download size={17} /> تشغيل محلي Excel</button><button className="action-button action-button--primary" onClick={() => void exportReportsExcel()}><FileText size={17} /> تقرير Excel</button></div></div>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">تحليل تشغيلي محلي</span><h3>{operationalRiskInsights.length ? `${operationalRiskInsights.length} أصناف تحتاج قرار شراء` : "المخزون تحت متابعة حسابية"}</h3><p>يحسب آخر 14 يومًا من مبيعات المحل ومتوسط الطلب وأيام التغطية داخل هذا الجهاز، دون أي خدمة خارجية أو إرسال بيانات إلى الإنترنت.</p></div><button className="action-button action-button--secondary" onClick={() => void exportLocalAnalysisExcel()}><Download size={17} /> تحليل تشغيل Excel</button></section>
              <div className="report-stats"><StatCard label="خطر نفاد عاجل" value={String(operationalInsights.filter((entry) => entry.risk === "urgent").length)} detail="تغطية لا تتجاوز 3 أيام وفق الطلب" icon={CircleAlert} tone="apricot" /><StatCard label="تحتاج متابعة" value={String(operationalInsights.filter((entry) => entry.risk === "watch").length)} detail="تغطية أسبوع أو أقل / قرب حد التنبيه" icon={TrendingUp} tone="sand" /><StatCard label="تكلفة شراء مقترحة" value={money(purchaseRecommendations.reduce((total, group) => total + group.estimatedCost, 0))} detail={`${purchaseRecommendations.reduce((total, group) => total + group.units, 0)} وحدة مقترحة`} icon={PackagePlus} tone="olive" /><StatCard label={`صافي سيولة ${cashFlowForecast.horizonDays} أيام`} value={money(cashFlowForecast.projectedNet)} detail={cashFlowForecast.signal === "positive" ? "توقع موجب" : cashFlowForecast.signal === "watch" ? "هامش محدود" : "يحتاج تدخلاً"} icon={WalletCards} tone={cashFlowForecast.signal === "negative" ? "apricot" : cashFlowForecast.signal === "watch" ? "sand" : "blue"} /></div>
              {operationalRiskInsights.length > 0 ? <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">أولوية الشراء</span><h3>توصيات قابلة للتفسير</h3></div><span className="status-badge">آخر 14 يومًا</span></div><div className="price-history-list">{operationalRiskInsights.slice(0, 8).map((entry) => <div className="price-history-row" key={`demand-${entry.productId}`}><span><strong>{entry.productName}</strong><small>{entry.supplierName} · {entry.explanation}</small></span><b dir="ltr">{entry.recommendedOrderQuantity} وحدة</b><span className={`status-badge ${entry.risk === "urgent" ? "status-badge--warning" : ""}`}>{entry.daysOfCover === null ? "لا بيانات طلب" : `${entry.daysOfCover.toFixed(1)} يوم تغطية`}</span></div>)}</div></section> : <section className="panel weekly-report-strip"><div><span className="section-kicker">أولوية الشراء</span><h3>لا توجد توصيات عاجلة حاليًا</h3><p>ستظهر التوصيات عندما تتوفر مبيعات محلية حديثة أو ينخفض الرصيد نحو حد التنبيه.</p></div></section>}
              {purchaseRecommendations.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">خطة شراء الموردين</span><h3>تجميع التوصيات لتقليل الجهد</h3></div><span className="status-badge">{purchaseRecommendations.length} موردين</span></div><div className="price-history-list">{purchaseRecommendations.slice(0, 6).map((group) => <div className="price-history-row" key={`recommendation-${group.supplierName}`}><span><strong>{group.supplierName}</strong><small>{group.entries.length} أصناف · {group.urgentItems ? `${group.urgentItems} عاجلة` : "لا أصناف عاجلة"}</small></span><b dir="ltr">{money(group.estimatedCost)}</b><span className="status-badge">{group.units} وحدة</span></div>)}</div></section>}
              <section className="panel weekly-report-strip"><div><span className="section-kicker">توقع السيولة</span><h3>{cashFlowForecast.signal === "positive" ? "التدفق المتوقع موجب" : cashFlowForecast.signal === "watch" ? "راقب هامش السيولة" : "راجع المصروفات والتحصيلات"}</h3><p>{cashFlowForecast.explanation} دخل متوقع {money(cashFlowForecast.projectedIncome)} · مصروفات متوقعة {money(cashFlowForecast.projectedExpenses)} خلال {cashFlowForecast.horizonDays} أيام.</p></div><span className={`status-badge ${cashFlowForecast.signal !== "positive" ? "status-badge--warning" : ""}`}>{money(cashFlowForecast.projectedNet)}</span></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">صندوق اليوم</span><h3>{todayCashClosing ? "إغلاق الوردية معتمد" : "مراجعة النقد قبل إغلاق الوردية"}</h3><p>نقد متوقع {money(todayCashSummary.expectedCash)} · تحصيل ذمم {money(todayCashSummary.debtCollections)} · مصروفات {money(todayCashSummary.expenses)} · صافي تشغيل {money(todayCashSummary.netOperatingProfit)}</p></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={() => setShowCashExpenseForm(true)}><Minus size={17} /> تسجيل مصروف</button><button className="action-button action-button--primary" onClick={openCashClosingForm}><Check size={17} /> {todayCashClosing ? "تحديث الإغلاق" : "إغلاق وردية"}</button></div></section>
              <div className="report-stats"><StatCard label="مبيعات نقدية" value={money(todayCashSummary.cashSales)} detail={`${todayCashSummary.invoices} فواتير اليوم`} icon={CircleDollarSign} tone="olive" /><StatCard label="تحصيل ذمم اليوم" value={money(todayCashSummary.debtCollections)} detail={`${todayCashSummary.collectionCount} تحصيلات نقدية`} icon={WalletCards} tone="sand" /><StatCard label="مبيعات آجلة" value={money(todayCashSummary.creditSales)} detail="لا تدخل ضمن نقد الصندوق" icon={WalletCards} tone="sand" /><StatCard label={todayCashClosing ? "فارق الإغلاق" : "النقد المتوقع"} value={money(todayCashClosing ? Math.abs(todayCashSummary.variance ?? 0) : todayCashSummary.expectedCash)} detail={todayCashClosing ? ((todayCashSummary.variance ?? 0) === 0 ? "النقد متطابق" : (todayCashSummary.variance ?? 0) > 0 ? "زيادة مسجلة" : "عجز يحتاج مراجعة") : "افتتاحي + مبيعات نقدية + تحصيل ذمم - مصروفات"} icon={ReceiptText} tone="blue" /></div>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مصروفات اليوم</span><h3>{todayExpenses.length ? `${todayExpenses.length} مصروفات مسجلة` : "لم تسجل مصروفات اليوم"}</h3><p>{todayExpenses.length ? todayExpenses.slice(0, 3).map((expense) => `${expense.category}: ${money(expense.amount)}`).join(" · ") : "سجّل الإيجار الجزئي أو النقل أو المشتريات التشغيلية لظهور صافي الربح بدقة."}</p></div><span className={`status-badge ${todayExpenses.length ? "status-badge--warning" : ""}`}>{money(todayCashSummary.expenses)}</span></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">سقف مصروفات اليوم</span><h3>{todayExpenseLimitStatus.active ? (todayExpenseLimitStatus.exceeded ? "تم تجاوز السقف" : todayExpenseLimitStatus.nearing ? "اقتربت من السقف" : "المصروفات ضمن السقف") : "لم يُضبط سقف بعد"}</h3><p>{todayExpenseLimitStatus.active ? `سُجل ${money(todayExpenseLimitStatus.spent)} من سقف ${money(todayExpenseLimitStatus.limit)} · المتبقي ${money(todayExpenseLimitStatus.remaining)}` : "اضبط سقفًا اختياريًا من الإعدادات لتظهر متابعة مبكرة قبل تجاوز مصروفات اليوم."}</p></div><button className="action-button action-button--secondary" onClick={() => setActivePage("settings")}><Settings size={17} /> ضبط السقف</button></section>
              {todayDebtCollections.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تحصيلات اليوم</span><h3>دخل نقدي من الذمم</h3></div><span className="status-badge">{money(todayCashSummary.debtCollections)}</span></div><div className="price-history-list">{todayDebtCollections.map((collection) => <div className="price-history-row" key={collection.id}><span><strong>{collection.customerName}</strong><small>{collection.note || formatDate(collection.collectedAt)}</small></span><b dir="ltr">+{money(collection.amount)}</b><button className="mini-icon mini-icon--danger" onClick={() => reverseDebtCollection(collection)} aria-label={`عكس تحصيل ${collection.customerName}`}><Trash2 size={15} /></button></div>)}</div></section>}
              {todayExpenses.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل الصندوق</span><h3>مصروفات اليوم</h3></div><button className="text-button" onClick={() => setShowCashExpenseForm(true)}><Plus size={16} /> إضافة مصروف</button></div><div className="price-history-list">{todayExpenses.map((expense) => <div className="price-history-row" key={expense.id}><span><strong>{expense.category}</strong><small>{expense.note || formatDate(expense.spentAt)}</small></span><b dir="ltr">-{money(expense.amount)}</b><button className="mini-icon mini-icon--danger" onClick={() => deleteCashExpense(expense)} aria-label={`حذف مصروف ${expense.category}`}><Trash2 size={15} /></button></div>)}</div></section>}
              {todayCashClosing && <section className="panel weekly-report-strip"><div><span className="section-kicker">تسوية الوردية</span><h3>{todayCashSummary.variance === 0 ? "النقد متطابق" : todayCashSummary.variance && todayCashSummary.variance > 0 ? "زيادة نقدية مسجلة" : "عجز نقدي يحتاج مراجعة"}</h3><p>{todayCashClosing.responsibleName ? `المسؤول: ${todayCashClosing.responsibleName} · ` : ""}فعلي {money(todayCashClosing.actualCash)} · متوقع {money(todayCashSummary.expectedCash)} · فارق {money(Math.abs(todayCashSummary.variance ?? 0))}</p></div><div className="row-actions"><button className="mini-icon" onClick={() => void exportCashClosingsExcel()} aria-label="تنزيل تسويات الوردية Excel"><Download size={15} /></button><button className="mini-icon" onClick={() => printCashClosing(todayCashClosing)} aria-label="طباعة إغلاق الوردية"><Printer size={15} /></button><button className="mini-icon mini-icon--danger" onClick={() => deleteCashClosing(todayCashClosing)} aria-label="إلغاء إغلاق الوردية"><Trash2 size={15} /></button></div></section>}
              <section className="panel price-history-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">الإرجاعات حسب الموظف</span><h3>{staffReturnsReport.totals.receipts ? `تقرير ${currentMonthKey} المحلي` : "لا توجد إرجاعات للموظفين هذا الشهر"}</h3></div><div className="inventory-page__actions"><span className="status-badge">{staffReturnsReport.totals.receipts} إيصالات · {staffReturnsReport.totals.units} وحدات</span><button className="action-button action-button--secondary" type="button" onClick={() => void exportAdvancedReturnAnalyticsExcel()}><Download size={16} /> Excel</button><button className="action-button action-button--secondary" type="button" onClick={printMonthlyReturnsSummary}><Printer size={16} /> طباعة الملخص</button></div></div>{staffReturnsReport.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الموظف</th><th>إيصالات الإرجاع</th><th>الوحدات</th><th>قيمة الإرجاع</th></tr></thead><tbody>{staffReturnsReport.entries.map((entry) => <tr key={`staff-return-${entry.staffMemberId}`}><td>{entry.staffMemberName}</td><td>{entry.receipts}</td><td>{entry.units}</td><td dir="ltr"><b>{money(entry.value)}</b></td></tr>)}</tbody><tfoot><tr><th>الإجمالي</th><th>{staffReturnsReport.totals.receipts}</th><th>{staffReturnsReport.totals.units}</th><th dir="ltr">{money(staffReturnsReport.totals.value)}</th></tr></tfoot></table></div> : <p className="modal-note">سيظهر هنا كل إرجاع مسجل في الشهر الحالي حسب اسم الموظف المحفوظ في الفاتورة. السجل بلا اسم يُعرض كـ«غير محدد».</p>}<p className="modal-note">حد التنبيه الحالي لنسبة الإرجاع: {store.returnRateAlertThreshold}% · يمكن تعديله من الإعدادات.</p></section>
              <section className="panel price-history-panel">
                <div className="panel-heading panel-heading--stack"><div><span className="section-kicker">إرجاع بيع محلي</span><h3>ابحث عن فاتورة ثم افتح سلة الإرجاع</h3></div><span className="status-badge">{saleReturns.length} إرجاعات</span></div>
                <div className="inventory-page__actions"><label className="field"><span>من تاريخ</span><input value={returnFilterFromDate} onChange={(event) => setReturnFilterFromDate(event.target.value)} type="date" /></label><label className="field"><span>إلى تاريخ</span><input value={returnFilterToDate} onChange={(event) => setReturnFilterToDate(event.target.value)} type="date" /></label><label className="field"><span>سبب الإرجاع</span><select value={returnReasonFilter} onChange={(event) => setReturnReasonFilter(event.target.value)}><option value="">كل الأسباب</option>{returnReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label><button className="action-button action-button--secondary" type="button" onClick={() => void exportFilteredReturnsExcel()}><Download size={16} /> الإرجاعات Excel</button><button className="action-button action-button--secondary" type="button" onClick={() => void exportAdvancedReturnAnalyticsExcel()}><BarChart3 size={16} /> تحليلات الإرجاع Excel</button></div>
                <label className="search-box"><Search size={17} /><input value={returnInvoiceQuery} onChange={(event) => setReturnInvoiceQuery(event.target.value)} placeholder="رقم الفاتورة أو اسم الزبون..." /></label>
                {filteredReturnableSales.length ? <div className="price-history-list">{filteredReturnableSales.map((sale) => { const remainingUnits = getSaleReturnableItems(sale, store.sales).reduce((total, item) => total + item.remainingQuantity, 0); return <div className="price-history-row" key={`returnable-${sale.id}`}><span><strong>فاتورة #{sale.id.slice(-5)}</strong><small>{formatDate(sale.createdAt)} · {sale.customerName ? `${sale.customerName} · ` : ""}متبقي للإرجاع {remainingUnits} وحدة · {sale.paymentMethod === "cash" ? "نقدًا" : "آجل / ذمة"}</small></span><b dir="ltr">{money(sale.total)}</b><button className="action-button action-button--secondary" onClick={() => openSaleReturn(sale)}><Undo2 size={15} /> فتح سلة الإرجاع</button></div>; })}</div> : <p className="modal-note">لا توجد فاتورة مطابقة قابلة للإرجاع. ابحث برقم الفاتورة أو اسم الزبون.</p>}
                {filteredSaleReturns.length > 0 ? <div className="price-history-list">{filteredSaleReturns.slice(0, 20).map((sale) => <div className="price-history-row" key={`return-receipt-${sale.id}`}><span><strong>إرجاع #{sale.id.slice(-5)}</strong><small>{formatDate(sale.createdAt)} · فاتورة أصلية #{sale.returnOfSaleId?.slice(-5) || "غير محددة"} · {sale.returnReason || "بدون سبب"}</small></span><b dir="ltr">{money(Math.abs(sale.total))}</b><button className="mini-icon" onClick={() => printReturnReceipt(sale)} aria-label={`طباعة إيصال الإرجاع ${sale.id.slice(-5)}`}><Printer size={15} /></button></div>)}</div> : <p className="modal-note">لا توجد إيصالات إرجاع تطابق التصفية الحالية.</p>}
                <p className="modal-note">اختر الكميات المتبقية فقط؛ تعيد سلة الإرجاع الأصناف للمخزون وتسجل أثرها المالي. لا يُسمح بإرجاع فاتورة آجلة بعد تحصيل جزء منها.</p>
              </section>
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تحليلات الإرجاع</span><h3>{saleReturns.length ? "أسباب واتجاهات الإرجاعات" : "لا توجد إرجاعات للتحليل بعد"}</h3></div><span className={`status-badge ${highReturnRateProducts.length ? "status-badge--warning" : ""}`}>{highReturnRateProducts.length ? `${highReturnRateProducts.length} أصناف تحتاج مراجعة` : "ضمن المتابعة"}</span></div>{saleReturns.length ? <><div className="report-stats"><StatCard label={`إرجاعات ${monthlyReturnComparison.month}`} value={String(monthlyReturnComparison.current.receipts)} detail={`${monthlyReturnComparison.current.units} وحدات · ${money(monthlyReturnComparison.current.value)}`} icon={Undo2} tone="apricot" /><StatCard label={`فرق عن ${monthlyReturnComparison.previousMonth}`} value={`${monthlyReturnComparison.receiptChange > 0 ? "+" : ""}${monthlyReturnComparison.receiptChange} إيصالات`} detail={`${monthlyReturnComparison.valueChange > 0 ? "+" : ""}${money(monthlyReturnComparison.valueChange)}`} icon={BarChart3} tone={monthlyReturnComparison.receiptChange > 0 ? "apricot" : "olive"} /><StatCard label="أكثر سبب تكرارًا" value={returnReasonSummary[0]?.reason || "—"} detail={returnReasonSummary[0] ? `${returnReasonSummary[0].receipts} إيصالات` : "لا توجد أسباب"} icon={CircleAlert} tone="sand" /></div><div className="price-history-list">{returnReasonSummary.slice(0, 5).map((entry) => <div className="price-history-row" key={`return-reason-${entry.reason}`}><span><strong>{entry.reason}</strong><small>{entry.receipts} إيصالات · {entry.units} وحدات مرتجعة</small></span><b dir="ltr">{money(entry.value)}</b></div>)}</div>{highReturnRateProducts.length > 0 && <div className="price-history-list">{highReturnRateProducts.slice(0, 5).map((entry) => <div className="price-history-row" key={`high-return-${entry.productId}`}><span><strong>{entry.productName}</strong><small>مرتجع {entry.returnedUnits} من {entry.soldUnits} مباعة</small></span><span className="status-badge status-badge--warning">{entry.returnRatePercent.toFixed(1)}%</span></div>)}</div>}</> : <p className="modal-note">ستظهر الأسباب والمقارنة الشهرية والتنبيهات بعد تسجيل إرجاعات فعلية محليًا.</p>}</section>
              <div className="weekly-report-strip"><div><span className="section-kicker">آخر 7 أيام</span><h3>ملخص الأرباح الأسبوعي</h3><p>{weeklySummary.invoices} فاتورة · مبيعات {money(weeklySummary.revenue)} · ربح {money(weeklySummary.profit)}</p></div><button className="action-button action-button--secondary" onClick={() => void exportWeeklyReportExcel()}><Download size={17} /> تقرير أسبوعي Excel</button></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">مقارنة أسبوعية</span><h3>{weekComparison.profitChange >= 0 ? "الأرباح ارتفعت" : "الأرباح انخفضت"} {money(Math.abs(weekComparison.profitChange))}</h3><p>هذا الأسبوع: مبيعات {money(weekComparison.current.revenue)} · ربح {money(weekComparison.current.profit)} · {weekComparison.current.invoices} فاتورة</p></div><div><span className="section-kicker">الأسبوع السابق</span><p>مبيعات {money(weekComparison.previous.revenue)} · ربح {money(weekComparison.previous.profit)} · {weekComparison.previous.invoices} فاتورة</p></div></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">هذا الشهر</span><h3>تقرير شهري مفصل</h3><p>{monthlySummary.invoices} فاتورة · {monthlySummary.units} وحدة · مبيعات {money(monthlySummary.revenue)} · ربح {money(monthlySummary.profit)}</p></div><div className="inventory-page__actions"><span className={`status-badge ${inactiveProducts.length ? "status-badge--warning" : ""}`}>{inactiveProducts.length ? `${inactiveProducts.length} أصناف بلا حركة` : "كل الأصناف لها حركة"}</span><button className="action-button action-button--secondary" onClick={() => void exportMonthlyReportExcel()}><Download size={17} /> تقرير شهري Excel</button></div></div>
              <section className="panel price-history-panel">
                <div className="panel-heading"><div><span className="section-kicker">ربحية الأصناف</span><h3>{productProfitabilityReport.entries.length ? `${productProfitabilityReport.entries.length} أصناف لها حركة هذا الشهر` : "لا توجد مبيعات لحساب الربحية"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportProductProfitabilityExcel()}><Download size={16} /> ربحية الأصناف Excel</button></div>
                {productProfitabilityReport.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>صافي الوحدات</th><th>مرتجع / نسبة</th><th>الإيراد الصافي</th><th>التكلفة</th><th>الربح</th><th>الهامش</th></tr></thead><tbody>{productProfitabilityReport.entries.slice(0, 12).map((entry) => <tr key={`profitability-${entry.productId}`}><td><strong>{entry.productName}</strong><small>{entry.transactionCount} حركات · خصومات {money(entry.discounts)}</small></td><td>{entry.units}</td><td><span className={`status-badge ${entry.returnRatePercent > 0 ? "status-badge--warning" : ""}`}>{entry.returnedUnits} / {entry.returnRatePercent.toFixed(1)}%</span><small>من {entry.soldUnits} مباعة</small></td><td dir="ltr">{money(entry.netRevenue)}</td><td dir="ltr">{money(entry.costOfGoods)}</td><td dir="ltr"><b className={entry.profit < 0 ? "low-number" : ""}>{money(entry.profit)}</b></td><td><span className={`status-badge ${entry.marginPercent < 0 ? "status-badge--warning" : ""}`}>{entry.marginPercent.toFixed(1)}%</span></td></tr>)}</tbody></table></div> : <p className="modal-note">سيظهر لكل صنف الإيراد والتكلفة والخصومات والربح بعد تسجيل مبيعات حقيقية.</p>}
                <p className="modal-note">نسبة الإرجاع = الوحدات المرتجعة ÷ الوحدات المباعة خلال الشهر. تدخل الإرجاعات والخصومات في صافي الربحية تلقائيًا.</p>
              </section>
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">مبيعات الموظفين</span><h3>{staffSalesReport.entries.length ? `${staffSalesReport.entries.length} موظفين لهم حركات هذا الشهر` : "لا توجد فواتير مرتبطة بموظف بعد"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportStaffSalesExcel()}><Download size={16} /> موظفون Excel</button></div>{staffSalesReport.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الموظف</th><th>فواتير البيع</th><th>الإرجاعات</th><th>صافي المبيعات</th><th>صافي الربح</th></tr></thead><tbody>{staffSalesReport.entries.map((entry) => <tr key={entry.staffMemberId}><td><strong>{entry.staffMemberName}</strong></td><td>{entry.invoices}</td><td>{entry.returns}</td><td dir="ltr">{money(entry.sales)}</td><td dir="ltr"><b className={entry.profit < 0 ? "low-number" : ""}>{money(entry.profit)}</b></td></tr>)}</tbody></table></div> : <p className="modal-note">أضف أسماء الموظفين من الإعدادات، ثم اختر الاسم عند البيع ليظهر التقرير محليًا. لا توجد حسابات أو تسجيل دخول.</p>}</section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">هدف الشهر</span><h3>{monthlyGoalProgress.active ? (monthlyGoalProgress.met ? "تم تحقيق الهدف الشهري" : "متابعة هدف مبيعات الشهر") : "لم يُضبط هدف شهري"}</h3><p>{monthlyGoalProgress.active ? `المبيعات ${money(monthlyGoalProgress.revenue)} من هدف ${money(monthlyGoalProgress.target)} · إنجاز ${monthlyGoalProgress.achievement.toFixed(1)}% · متبقي ${money(monthlyGoalProgress.remaining)}.` : "اضبط هدفًا شهريًا من لوحة اليوم لمقارنة نمو مبيعات المحل بصورة مباشرة."}</p></div><div className="inventory-page__actions"><span className={`status-badge ${monthlyGoalProgress.active && !monthlyGoalProgress.met ? "status-badge--warning" : ""}`}>{monthlyGoalProgress.active ? (monthlyGoalProgress.met ? "متحقق" : `${monthlyGoalProgress.achievement.toFixed(0)}%`) : "اختياري"}</span><button className="action-button action-button--secondary" onClick={() => setShowMonthlyGoalForm(true)}><CalendarDays size={17} /> {monthlyGoalProgress.active ? "تعديل الهدف" : "ضبط هدف الشهر"}</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مصروفات هذا الشهر</span><h3>{monthlyExpenseReport.count ? `${monthlyExpenseReport.count} مصروفات · ${monthlyExpenseReport.groups.length} تصنيفات` : "لا توجد مصروفات شهرية مسجلة"}</h3><p>{monthlyExpenseReport.groups.length ? monthlyExpenseReport.groups.slice(0, 3).map((group) => `${group.category}: ${money(group.amount)}`).join(" · ") : "سجّل المصروفات اليومية لتظهر هنا مجمعة حسب التصنيف."}</p></div><div className="inventory-page__actions"><span className="status-badge">{money(monthlyExpenseReport.amount)}</span><button className="action-button action-button--secondary" onClick={() => void exportMonthlyExpensesExcel()}><Download size={17} /> مصروفات Excel</button></div></section>
              <div className="weekly-report-strip"><div><span className="section-kicker">هدر الصلاحية</span><h3>{expiryWasteReport.units ? `${expiryWasteReport.units} وحدات منتهية تحتاج معالجة` : "لا يوجد هدر صلاحية مسجل"}</h3><p>{expiryWasteReport.units ? `تكلفة تقديرية ${money(expiryWasteReport.cost)} من ${expiryWasteReport.entries.length} دفعات منتهية.` : "سيظهر هنا الرصيد المتبقي في الدفعات المنتهية فقط."}</p></div><button className="action-button action-button--secondary" onClick={() => void exportExpiryWasteExcel()}><Download size={17} /> تقرير هدر Excel</button></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">تكلفة المخزون حسب المورد</span><h3>{supplierInventoryCostReport.groups.length ? `${supplierInventoryCostReport.groups.length} موردين · ${supplierInventoryCostReport.units} وحدات` : "لا توجد دفعات نشطة"}</h3><p>{supplierInventoryCostReport.groups.length ? `إجمالي تكلفة الدفعات النشطة ${money(supplierInventoryCostReport.cost)}.` : "سيظهر هنا رصيد الدفعات المتبقي مجمعًا حسب المورد."}</p></div><button className="action-button action-button--secondary" onClick={() => void exportSupplierInventoryCostExcel()}><Download size={17} /> تكلفة الموردين Excel</button></div>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مشتريات الموردين</span><h3>{supplierPurchaseReport.groups.length ? `${supplierPurchaseReport.groups.length} موردين · صافي ${money(supplierPurchaseReport.net)}` : "لا توجد مشتريات في الفترة المختارة"}</h3><p>استلام {money(supplierPurchaseReport.received)} · إرجاع {money(supplierPurchaseReport.returned)} · تُستخرج من سجلات الدفعات المحفوظة.</p></div><div className="inventory-page__actions"><label className="field"><span>الشهر</span><input aria-label="شهر تقرير مشتريات الموردين" type="month" value={supplierPurchasesMonth} onChange={(event) => setSupplierPurchasesMonth(event.target.value || new Date().toISOString().slice(0, 7))} /></label><button className="action-button action-button--secondary" onClick={() => void exportSupplierPurchasesExcel()}><Download size={17} /> مشتريات Excel</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مقارنة مشتريات الموردين</span><h3>{supplierPurchaseComparison.difference === 0 ? "الصافي ثابت عن الشهر السابق" : supplierPurchaseComparison.difference > 0 ? "المشتريات ارتفعت عن الشهر السابق" : "المشتريات انخفضت عن الشهر السابق"}</h3><p>الشهر المختار {money(supplierPurchaseComparison.currentNet)} · الشهر السابق {money(supplierPurchaseComparison.previousNet)} · الفرق {money(Math.abs(supplierPurchaseComparison.difference))}</p></div><span className={`status-badge ${supplierPurchaseComparison.difference > 0 ? "status-badge--warning" : ""}`}>{supplierPurchaseComparison.groups.length} موردين</span></section>
              {supplierPurchaseComparison.groups.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تفاصيل المقارنة</span><h3>صافي المشتريات لكل مورد</h3></div><span className="status-badge">{supplierPurchaseComparison.previousMonth}</span></div><div className="price-history-list">{supplierPurchaseComparison.groups.map((group) => <div className="price-history-row" key={`purchase-comparison-${group.supplierName}`}><span><strong>{group.supplierName}</strong><small>السابق {money(group.previousNet)} · المختار {money(group.currentNet)}</small></span><b dir="ltr">{group.difference > 0 ? "+" : ""}{money(group.difference)}</b></div>)}</div></section>}
              <section className="panel weekly-report-strip"><div><span className="section-kicker">سقف ائتمان الموردين</span><h3>{supplierCreditStatus.groups.length ? `${supplierCreditStatus.exceededCount} تجاوزات · ${supplierCreditStatus.nearingCount} اقتربت من السقف` : "أضف دفعات الموردين أولًا"}</h3><p>سقف الائتمان محفوظ على هذا الجهاز ويُقارن بالرصيد المستحق بعد المدفوعات والإرجاعات.</p></div>{supplierCreditStatus.groups.length ? <div className="notification-settings">{supplierCreditStatus.groups.map((group) => <label key={group.supplierName} className={`notification-setting ${group.exceeded || group.nearing ? "notification-setting--on" : ""}`}><span><strong>{group.supplierName}</strong><small>الرصيد {money(group.outstanding)} · {group.creditLimit ? (group.exceeded ? "تجاوز السقف" : group.nearing ? "اقترب من السقف" : `متاح ${money(group.availableCredit)}`) : "بدون سقف"}</small></span><input aria-label={`سقف ائتمان ${group.supplierName}`} type="number" min="0" step="0.01" value={group.creditLimit || ""} onChange={(event) => updateSupplierCreditLimit(group.supplierName, event.target.value)} placeholder="سقف د.ل" /></label>)}</div> : null}</section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">استحقاقات الموردين</span><h3>{supplierDueDateStatuses.length ? `${supplierDueDateStatuses.filter((status) => status.overdue).length} متأخرة · ${supplierDueDateStatuses.filter((status) => status.nearing).length} قريبة` : "اضبط موعد الاستحقاق لكل مورد"}</h3><p>يظهر التنبيه محليًا عند فتح سوقنا قبل 3 أيام من الموعد أو فور تأخره، دون إرسال تلقائي.</p></div>{supplierCreditStatus.groups.length ? <div className="notification-settings">{supplierCreditStatus.groups.map((group) => { const due = supplierDueDateStatuses.find((status) => status.supplierName === group.supplierName); return <label key={`due-${group.supplierName}`} className={`notification-setting ${due?.overdue || due?.nearing ? "notification-setting--on" : ""}`}><span><strong>{group.supplierName}</strong><small>{due ? (due.overdue ? `متأخر ${Math.abs(due.daysUntilDue)} يوم · ${money(due.outstanding)}` : `موعد ${due.dueDate} · ${money(due.outstanding)}`) : `الرصيد المستحق ${money(group.outstanding)}`}</small></span><input aria-label={`استحقاق ${group.supplierName}`} type="date" value={store.supplierDueDates[group.supplierName] ?? ""} onChange={(event) => updateSupplierDueDate(group.supplierName, event.target.value)} /></label>; })}</div> : null}</section>
              {supplierObligationReport.obligations.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تصنيف التزامات الموردين</span><h3>{supplierObligationReport.overdueCount} متأخرة · {supplierObligationReport.nearDueCount} قريبة · {supplierObligationReport.payableCount} مستحقة</h3></div><span className={`status-badge ${supplierObligationReport.overdueCount ? "status-badge--warning" : ""}`}>{supplierObligationReport.settledCount} بلا رصيد</span></div><div className="price-history-list">{supplierObligationReport.obligations.map((item) => { const label = item.status === "overdue" ? "متأخر" : item.status === "nearDue" ? "قريب" : item.status === "payable" ? "مستحق" : "بلا رصيد"; return <div className="price-history-row" key={`obligation-${item.supplierName}`}><span><strong>{item.supplierName}</strong><small>{item.dueDate ? `استحقاق ${item.dueDate}` : "لم يحدد موعد استحقاق"}</small></span><span className={`status-badge ${item.status === "overdue" || item.status === "nearDue" ? "status-badge--warning" : ""}`}>{label}</span><b dir="ltr">{money(item.outstanding)}</b></div>; })}</div></section>}
              {supplierCreditStatus.groups.length > 0 && <section className="panel weekly-report-strip"><div><span className="section-kicker">حسابات الموردين</span><h3>دفع وكشف حساب شهري</h3><p>سجّل الدفعة للمورد ثم اطبع المستند أو كشف الحساب الشهري من نافذة النظام.</p></div><div className="notification-settings">{supplierCreditStatus.groups.map((group) => <div className="notification-setting" key={`actions-${group.supplierName}`}><span><strong>{group.supplierName}</strong><small>الرصيد المستحق {money(group.outstanding)}</small></span><div className="row-actions"><button className="mini-icon" onClick={() => setSupplierPaymentSupplier(group.supplierName)} aria-label={`تسجيل دفع إلى ${group.supplierName}`}><CircleDollarSign size={14} /></button><button className="mini-icon" onClick={() => printSupplierMonthlyStatement(group.supplierName)} aria-label={`طباعة كشف حساب ${group.supplierName}`}><Printer size={14} /></button></div></div>)}</div></section>}
              {supplierOperatingSummary.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">ملخص تشغيلي للمورد</span><h3>رصيد، مخزون، وإنفاق الشهر</h3></div><span className="status-badge">{supplierOperatingSummary.length} موردين</span></div><div className="price-history-list">{supplierOperatingSummary.map((supplier) => <div className="price-history-row" key={`summary-${supplier.supplierName}`}><span><strong>{supplier.supplierName}</strong><small>مخزون بسعر الشراء {money(supplier.inventoryCost)} · مدفوع الشهر {money(supplier.monthlyPayments)}</small></span><b dir="ltr">{money(supplier.outstanding)}</b></div>)}</div></section>}
              <div className="report-stats"><StatCard label="مبيعات هذا الشهر" value={money(monthSales.reduce((total, sale) => total + sale.total, 0))} detail={`${monthSales.length} فاتورة`} icon={CircleDollarSign} tone="olive" /><StatCard label="أرباح هذا الشهر" value={money(monthSales.reduce((total, sale) => total + sale.profit, 0))} detail="فرق البيع عن الشراء" icon={TrendingUp} tone="blue" /><StatCard label="متوسط الفاتورة" value={money(monthSales.length ? monthSales.reduce((total, sale) => total + sale.total, 0) / monthSales.length : 0)} detail="لكل بيع مسجل" icon={ReceiptText} tone="sand" /></div>
              <div className="report-columns"><section className="panel report-chart"><div className="panel-heading"><div><span className="section-kicker">هذا الشهر</span><h3>الأصناف الأكثر مبيعًا</h3></div><span className="chart-note">حسب الوحدات</span></div>{itemSales.length ? <div className="bars">{itemSales.slice(0, 6).map((item, index) => <div className="bar-row" key={item.name}><div><span>{index + 1}</span><strong>{item.name}</strong></div><div className="bar-track"><i style={{ width: `${(item.quantity / itemSales[0].quantity) * 100}%` }} /></div><b>{item.quantity}</b></div>)}</div> : <EmptyState icon={BarChart3} title="التقرير ينتظر أول عملية بيع" description="سجّل فواتيرك وستظهر المنتجات الأعلى مبيعًا هنا." />}</section><section className="panel report-totals"><div className="panel-heading"><div><span className="section-kicker">ملخص النشاط</span><h3>نظرة مالية</h3></div></div><div className="financial-stack"><div><span>إيرادات الشهر</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + sale.total, 0))}</b></div><div><span>تكلفة البضاعة المباعة</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + (sale.total - sale.profit), 0))}</b></div><div className="financial-stack__profit"><span>الربح الإجمالي</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + sale.profit, 0))}</b></div></div><div className="report-advice"><TrendingUp size={18} /><p>{monthSales.length ? "استمر في تسجيل كل فاتورة؛ دقة التقرير تتحسن مع انتظام الإدخال." : "ستظهر هنا مقارنة شهرية تلقائية بمجرد بدء البيع."}</p></div></section></div>
            </section>
          )}

          {page === "settings" && (
            <section className="settings-page">
              <div className="page-intro"><div><span className="eyebrow"><Settings size={15} /> تحكم محلي</span><h2>إعدادات بسيطة، <em>بياناتك بيدك.</em></h2><p>يُحفظ كل ما تسجله داخل متصفح هذا الجهاز. احتفظ بنسخة احتياطية دورية.</p></div></div>
              <div className="settings-grid">
                <section className="panel settings-card settings-card--receipt">
                  <div className="setting-icon"><Store size={21} /></div>
                  <div><span className="section-kicker">هوية الإيصال</span><h3>اسم المحل وشعاره</h3><p>تُحفظ الهوية على هذا الجهاز وتظهر في كل فاتورة مطبوعة.</p></div>
                  <div className="receipt-settings">
                    <label><span>اسم المحل</span><input value={store.storeName} onChange={(event) => setStore((current) => ({ ...current, storeName: event.target.value }))} placeholder="اسم محلك" /></label>
                    <label><span>هاتف المحل (اختياري)</span><input value={store.storePhone} inputMode="tel" onChange={(event) => setStore((current) => ({ ...current, storePhone: event.target.value }))} placeholder="مثال: 091 000 0000" /></label>
                    <div className="receipt-logo-picker">
                      <img src={store.receiptLogo || logoUrl} alt={store.receiptLogo ? `شعار ${store.storeName}` : "شعار سوقنا الافتراضي"} />
                      <div><b>{store.receiptLogo ? "شعار محلك" : "شعار سوقنا الافتراضي"}</b><small>يُصغّر تلقائيًا ويُحفظ محليًا. JPG أو PNG أو WebP.</small></div>
                      <input className="hidden-input" ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { uploadReceiptLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                      <div className="receipt-logo-picker__actions"><button type="button" className="action-button action-button--secondary" onClick={() => logoInputRef.current?.click()}><Upload size={16} /> رفع شعار</button>{store.receiptLogo && <button type="button" className="text-button" onClick={() => { setStore((current) => ({ ...current, receiptLogo: "" })); toast.success("سيُستخدم شعار سوقنا الافتراضي في الإيصالات."); }}>إزالة الشعار</button>}</div>
                    </div>
                    <label><span>خصم افتراضي عند الفاتورة (%)</span><input value={store.defaultDiscountPercent || ""} inputMode="decimal" type="number" min="0" max="100" step="0.5" onChange={(event) => setStore((current) => ({ ...current, defaultDiscountPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))} placeholder="0" /></label>
                    <label><span>سقف مصروفات اليوم (د.ل)</span><input value={store.dailyExpenseLimit || ""} inputMode="decimal" type="number" min="0" step="0.01" onChange={(event) => setStore((current) => ({ ...current, dailyExpenseLimit: Math.max(0, Number(event.target.value) || 0) }))} placeholder="بدون سقف" /><small>{todayExpenseLimitStatus.active ? `اليوم: ${money(todayExpenseLimitStatus.spent)} من ${money(todayExpenseLimitStatus.limit)}` : "اختياري: سيظهر تنبيه عند 80% وعند التجاوز."}</small></label>
                    <label><span>حد تنبيه نسبة الإرجاع (%)</span><input value={store.returnRateAlertThreshold} inputMode="decimal" type="number" min="1" max="100" step="0.5" onChange={(event) => setStore((current) => ({ ...current, returnRateAlertThreshold: Math.min(100, Math.max(1, Number(event.target.value) || 10)) }))} /><small>يظهر تنبيه محلي للصنف عندما تبلغ نسبة إرجاعه هذا الحد أو تتجاوزه.</small></label>
                  </div>
                </section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--blue"><UserRound size={21} /></div><div><span className="section-kicker">فئات الزبائن</span><h3>خصومات محلية حسب الفئة</h3><p>أنشئ الفئات التي تناسب محلك، ثم اخترها في الفاتورة لتعبئة الخصم تلقائيًا. يبقى الخصم قابلًا للتعديل لكل عملية بيع.</p></div><form className="receipt-settings" onSubmit={addCustomerCategory}><label><span>اسم الفئة *</span><input name="name" maxLength={60} placeholder="مثال: زبون دائم" required /></label><label><span>الخصم (%) *</span><input name="discountPercent" type="number" inputMode="decimal" min="0" max="100" step="0.5" placeholder="مثال: 5" required /></label><button className="action-button action-button--secondary" type="submit"><Plus size={17} /> إضافة فئة</button></form>{store.customerCategories.length ? <div className="price-history-list">{store.customerCategories.map((category) => <div className="price-history-row" key={category.id}><span><strong>{category.name}</strong><small>خصم افتراضي في الفاتورة</small></span><b dir="ltr">{category.discountPercent}%</b><button className="mini-icon mini-icon--danger" onClick={() => deleteCustomerCategory(category)} aria-label={`حذف فئة ${category.name}`}><Trash2 size={15} /></button></div>)}</div> : <p className="modal-note">لا توجد فئات بعد؛ لن تُنشأ أي فئات تلقائيًا.</p>}</section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--blue"><UserRound size={21} /></div><div><span className="section-kicker">موظفو المحل</span><h3>أسماء محلية للفواتير</h3><p>أضف أسماء اختيارية للكاشير أو العاملين ثم اختر الاسم عند البيع. لا توجد حسابات أو تسجيل دخول أو تتبع خارجي.</p></div><form className="receipt-settings" onSubmit={addLocalStaffMember}><label><span>اسم الموظف *</span><input name="name" maxLength={60} placeholder="مثال: كاشير صباحي" required /></label><button className="action-button action-button--secondary" type="submit"><Plus size={17} /> إضافة موظف</button></form>{store.localStaff.length ? <div className="price-history-list">{store.localStaff.map((member) => <div className="price-history-row" key={member.id}><span><strong>{member.name}</strong><small>يظهر كخيار عند تسجيل البيع</small></span><button className="mini-icon mini-icon--danger" onClick={() => deleteLocalStaffMember(member)} aria-label={`حذف الموظف ${member.name}`}><Trash2 size={15} /></button></div>)}</div> : <p className="modal-note">لا توجد أسماء موظفين بعد؛ الفواتير ستبقى بلا اسم موظف حتى تضيف اسمًا وتختاره.</p>}</section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--apricot"><ShieldCheck size={21} /></div><div><span className="section-kicker">قفل العمليات الحساسة</span><h3>{actionLockSettings.enabled ? "القفل المحلي مفعّل" : "قفل اختياري برمز محلي"}</h3><p>عند تفعيله، يطلب سوقنا الرمز قبل حذف صنف أو مصروف، إلغاء إغلاق وردية، اعتماد جرد جماعي، أو اعتماد إرجاع بيع. لا يُرسل الرمز خارج هذا الجهاز.</p></div>{actionLockSettings.enabled ? <div className="receipt-settings"><span className="status-badge">مفعّل برمز رقمي</span><button className="action-button action-button--secondary" onClick={disableActionLock}><ShieldOff size={17} /> إيقاف القفل</button></div> : <form className="receipt-settings" onSubmit={saveActionLock}><label><span>رمز القفل (4–8 أرقام)</span><input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,8}" autoComplete="new-password" required /></label><label><span>تأكيد الرمز</span><input name="confirmation" type="password" inputMode="numeric" pattern="[0-9]{4,8}" autoComplete="new-password" required /></label><button className="action-button action-button--secondary" type="submit"><ShieldCheck size={17} /> تفعيل القفل</button></form>}</section>
                <section className="panel settings-card settings-card--printer settings-card--printer-hub"><div className="setting-icon setting-icon--blue"><Printer size={21} /></div><div><span className="section-kicker">مركز الطباعة الحرارية</span><h3>اطبع عبر هاتف أندرويد</h3><p>لا يحتاج سوقنا إلى موديل محدد. ابدأ دائمًا باختيار الطابعة من نافذة أندرويد؛ فهذا يعرض الطابعات التي يعرفها هاتفك.</p></div><div className="printer-settings"><div className="printer-detect printer-detect--primary"><button onClick={printTestReceipt}><Printer size={15} /> اختيار طابعة من النظام</button><button onClick={() => void connectThermalPrinter()}><Bluetooth size={15} /> طابعة بلوتوث</button></div><details className="printer-usb-advanced"><summary><Search size={14} /> لدي كابل OTG وطابعة USB</summary><div><p>اضغط البحث فقط بعد وصل الطابعة بالهاتف عبر OTG. إن ظهرت أجهزة «مجهولة أو غير متوافقة»، ألغِ النافذة ولا تقرنها.</p><button onClick={() => void detectUsbThermalPrinter()}><Search size={14} /> بحث عن طابعة USB</button></div></details><span>مقاس الورق</span><div className="paper-presets"><button className={printerSettings.paperWidth === "58" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "58" }))}>58 مم</button><button className={printerSettings.paperWidth === "80" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "80" }))}>80 مم</button><button className={printerSettings.paperWidth === "A4" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "A4" }))}>A4</button></div><label className="printer-name"><span>اسم الطابعة</span><input value={printerSettings.deviceName} onChange={(event) => setPrinterSettings((current) => ({ ...current, deviceName: event.target.value }))} placeholder="اختياري — يُحفظ محليًا" /></label><label className="printer-name"><span>الطراز / رقم الملصق (اختياري)</span><input value={printerSettings.model} onChange={(event) => setPrinterSettings((current) => ({ ...current, model: event.target.value }))} placeholder="أي طابعة حرارية" /></label><label className="printer-name"><span>طريقة التوصيل</span><select value={printerSettings.connection} onChange={(event) => setPrinterSettings((current) => ({ ...current, connection: event.target.value as PrinterSettings["connection"] }))}><option value="system">اختيار من نافذة النظام</option><option value="usb">USB عبر وصلة OTG</option><option value="bluetooth">بلوتوث</option><option value="network">شبكة Wi‑Fi/LAN</option></select></label><p className="printer-help"><b>الخطوة الصحيحة أولًا:</b> اضغط «اختيار طابعة من النظام». إذا لم يظهر اسم الطابعة، افتح في أندرويد: <strong>الإعدادات ← الأجهزة المتصلة ← الطباعة</strong>، ثم فعّل خدمة طباعة متوافقة وأعد المحاولة. تحتاج طابعة USB إلى وصلة OTG أو اتصال شبكة قبل أن تصبح متاحة.</p></div></section>
                <section className="panel settings-card settings-card--install"><div className="setting-icon setting-icon--blue"><Download size={21} /></div><div><span className="section-kicker">تطبيق الهاتف</span><h3>ثبّت سوقنا على الشاشة</h3><p>افتحه من أيقونة مستقلة واستخدمه كمساعد يومي لمتجرك حتى عند انقطاع الإنترنت.</p></div><button className="action-button action-button--secondary" onClick={() => void installOnDevice()}><Download size={17} /> {installPrompt ? "تثبيت سوقنا الآن" : "إرشادات التثبيت"}</button></section>
                <section className="panel settings-card settings-card--readiness"><div className="setting-icon"><Check size={21} /></div><div><span className="section-kicker">جاهزية التشغيل</span><h3>حالة محلك على هذا الهاتف</h3><p>ملخص سريع للمكونات المحلية التي تحتاجها قبل بدء اليوم.</p></div><div className="readiness-list"><span><i /> التخزين المحلي: جاهز</span><span><i /> الطباعة: {printerSettings.deviceName || "اختيار الطابعة من النظام"}</span><span className={lastBackupAt ? "readiness-list__ok" : "readiness-list__attention"}><i /> النسخة الاحتياطية: {lastBackupAt ? `آخر تنزيل ${formatDate(lastBackupAt)}` : "صدّر نسخة أولى اليوم"}</span></div></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--apricot"><Download size={21} /></div><div><span className="section-kicker">نسخة احتياطية</span><h3>تصدير بياناتك</h3><p>نزّل ملفًا واحدًا يحتوي على المنتجات والفواتير والذمم، واحفظه في مكان آمن.</p></div><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> تصدير البيانات</button></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--sand"><Upload size={21} /></div><div><span className="section-kicker">استعادة</span><h3>استيراد نسخة</h3><p>يفحص سوقنا الملف ويعرض ملخصه قبل أن يستبدل بيانات هذا الجهاز.</p></div><input className="hidden-input" ref={fileInputRef} type="file" accept="application/json" onChange={(event) => { void importData(event.target.files?.[0]); event.currentTarget.value = ""; }} /><button className="action-button action-button--secondary" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> استيراد نسخة</button></section>
                <section className="panel settings-card settings-card--notifications"><div className="setting-icon setting-icon--blue"><BellRing size={21} /></div><div><span className="section-kicker">تنبيهات مخصصة</span><h3>مركز إشعارات المحل</h3><p>اختر التنبيهات التي تظهر لك في الجرس. تبقى اختياراتك على هذا الجهاز.</p></div><div className="notification-settings"><button className={notificationPreferences.stock ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, stock: !current.stock }))}><span><Archive size={15} /> انخفاض المخزون</span><i aria-label={notificationPreferences.stock ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.debts ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, debts: !current.debts }))}><span><WalletCards size={15} /> الذمم المستحقة</span><i aria-label={notificationPreferences.debts ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.cash ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, cash: !current.cash }))}><span><CircleDollarSign size={15} /> سقف مصروفات اليوم</span><i aria-label={notificationPreferences.cash ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.goals ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, goals: !current.goals }))}><span><TrendingUp size={15} /> تحقيق هدف المبيعات</span><i aria-label={notificationPreferences.goals ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.backup ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, backup: !current.backup }))}><span><Download size={15} /> نسخة احتياطية يومية</span><i aria-label={notificationPreferences.backup ? "مفعل" : "متوقف"} /></button></div></section>
                <section className="panel settings-card settings-card--danger"><div className="setting-icon setting-icon--danger"><Trash2 size={21} /></div><div><span className="section-kicker">إعادة ضبط</span><h3>بدء محل جديد</h3><p>يحذف بيانات هذا المحل من الجهاز بالكامل ولا يضيف أي منتجات افتراضية. صدّر نسخة قبل المتابعة.</p></div><button className="action-button action-button--danger" onClick={resetData}><Trash2 size={17} /> حذف البيانات</button></section>
              </div>
              <section className="local-assurance" style={{ backgroundImage: `linear-gradient(90deg, rgba(31,76,60,.97), rgba(31,76,60,.88)), url(${receiptPatternUrl})` }}><img src={logoUrl} alt="" /><div><h3>محلك يستمر، حتى لو انقطع الإنترنت.</h3><p>سوقنا تطبيق محلي: الحسابات تعمل مباشرة على جهازك، ولا تحتاج إلى تسجيل دخول أو خادم لتتابع البيع.</p></div><span><WifiOff size={18} /> محلي بالكامل</span></section>
            </section>
          )}
        </div>
      </main>

      {showMonthlyGoalForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitMonthlySalesGoal} role="dialog" aria-modal="true" aria-label="ضبط هدف مبيعات شهري"><div className="modal-heading"><div><span className="section-kicker">مبيعات الشهر</span><h3>ضبط هدف شهري محلي</h3></div><button type="button" className="icon-button" onClick={() => setShowMonthlyGoalForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>الشهر</span><input name="month" type="month" defaultValue={currentMonthKey} required /></label><label className="field"><span>هدف المبيعات (د.ل) *</span><input name="target" autoFocus type="number" min="0.01" step="0.01" defaultValue={monthlyGoalProgress.active ? monthlyGoalProgress.target : ""} placeholder="مثال: 15000" required /></label></div><p className="modal-note">يُحسب إنجاز الهدف من صافي مبيعات الشهر المحفوظة على هذا الجهاز، بما فيها أي إرجاعات مسجلة.</p><div className="modal-actions">{monthlyGoalProgress.active && <button type="button" className="text-button" onClick={clearMonthlySalesGoal}>إزالة هدف الشهر</button>}<button type="button" className="action-button action-button--secondary" onClick={() => setShowMonthlyGoalForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><CalendarDays size={17} /> حفظ هدف الشهر</button></div></form></div>}
      {showDailyGoalForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitDailySalesGoal} role="dialog" aria-modal="true" aria-label="ضبط هدف مبيعات يومي"><div className="modal-heading"><div><span className="section-kicker">مبيعات اليوم</span><h3>ضبط هدف محلي</h3></div><button type="button" className="icon-button" onClick={() => setShowDailyGoalForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>تاريخ الهدف</span><input name="date" type="date" defaultValue={todayKey()} required /></label><label className="field"><span>هدف المبيعات (د.ل) *</span><input name="target" autoFocus type="number" min="0.01" step="0.01" defaultValue={dailyGoalProgress.active ? dailyGoalProgress.target : ""} placeholder="مثال: 500" required /></label></div><p className="modal-note">يُستخدم الهدف للمتابعة والتنبيه داخل هذا الجهاز فقط، ولا يرسل أي بيانات إلى الإنترنت.</p><div className="modal-actions">{dailyGoalProgress.active && <button type="button" className="text-button" onClick={clearDailySalesGoal}>إزالة هدف اليوم</button>}<button type="button" className="action-button action-button--secondary" onClick={() => setShowDailyGoalForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><TrendingUp size={17} /> حفظ الهدف</button></div></form></div>}
      {showProductForm && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={saveProduct} role="dialog" aria-modal="true" aria-label={editingProduct ? "تعديل صنف" : "إضافة صنف"}><div className="modal-heading"><div><span className="section-kicker">المخزون</span><h3>{editingProduct ? "تعديل الصنف" : "إضافة صنف جديد"}</h3></div><button type="button" className="icon-button" onClick={() => { setShowProductForm(false); setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field field--wide"><span>اسم الصنف *</span><input name="name" autoFocus placeholder="مثال: زيت نباتي 1 لتر" defaultValue={editingProduct?.name} required /></label><label className="field"><span>رمز الصنف</span><input name="sku" placeholder="1006" defaultValue={editingProduct?.sku || pendingBarcode} /></label><label className="field"><span>التصنيف</span><input name="category" placeholder="مواد أساسية" defaultValue={editingProduct?.category || "عام"} /></label><label className="field"><span>اسم المورد (اختياري)</span><input name="supplierName" placeholder="مثال: مورد الحي" defaultValue={editingProduct?.supplierName || ""} /></label><label className="field"><span>تاريخ الصلاحية (اختياري)</span><input name="expiryDate" type="date" defaultValue={editingProduct?.expiryDate || ""} /></label><label className="field"><span>الكمية الحالية *</span><input name="quantity" type="number" min="0" defaultValue={editingProduct?.quantity ?? "0"} required /></label><label className="field"><span>حد التنبيه *</span><input name="lowStockAt" type="number" min="0" defaultValue={editingProduct?.lowStockAt ?? "5"} required /></label><label className="field"><span>سعر الشراء (د.ل) *</span><input name="purchasePrice" type="number" step="0.01" min="0" defaultValue={editingProduct?.purchasePrice} required /></label><label className="field"><span>سعر البيع (د.ل) *</span><input name="salePrice" type="number" step="0.01" min="0" defaultValue={editingProduct?.salePrice} required /></label><label className="field"><span>عرض كمية: من عدد</span><input name="quantityOfferMinimum" type="number" min="1" step="1" inputMode="numeric" placeholder="مثال: 3" defaultValue={editingProduct?.quantityOffers?.[0]?.minimumQuantity ?? ""} /></label><label className="field"><span>خصم عرض الكمية (%)</span><input name="quantityOfferDiscount" type="number" min="0.01" max="100" step="0.01" inputMode="decimal" placeholder="مثال: 5" defaultValue={editingProduct?.quantityOffers?.[0]?.discountPercent ?? ""} /></label><label className="field"><span>بداية العرض (اختيارية)</span><input name="quantityOfferStartDate" type="date" defaultValue={editingProduct?.quantityOffers?.[0]?.startDate ?? ""} /></label><label className="field"><span>نهاية العرض (اختيارية)</span><input name="quantityOfferEndDate" type="date" defaultValue={editingProduct?.quantityOffers?.[0]?.endDate ?? ""} /></label><p className="modal-note field--wide">عند بلوغ كمية الصنف المحددة، يطبّق الخصم تلقائيًا في السلة خلال مدة العرض فقط. اترك حد العرض والخصم فارغين لإلغاء عرض الكمية.</p><div className="product-photo-field field field--wide"><span>صورة الصنف (اختيارية)</span><input className="hidden-input" ref={productImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(event) => { uploadProductImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /><div>{pendingProductImage ? <img src={pendingProductImage} alt="معاينة صورة الصنف" /> : <span><Camera size={20} /> لم تضف صورة بعد</span>}<button type="button" className="action-button action-button--secondary" onClick={() => productImageInputRef.current?.click()}><Camera size={16} /> كاميرا أو معرض</button>{pendingProductImage && <button type="button" className="text-button" onClick={() => setPendingProductImage("")}>إزالة الصورة</button>}</div><small>تُصغّر الصورة وتُحفظ محليًا على هذا الهاتف.</small></div></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setShowProductForm(false); setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit">{editingProduct ? <Pencil size={17} /> : <PackagePlus size={17} />}{editingProduct ? " حفظ التعديلات" : " حفظ الصنف"}</button></div></form></div>}
      {showDebtForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={addDebt} role="dialog" aria-modal="true" aria-label="إضافة ذمة"><div className="modal-heading"><div><span className="section-kicker">دفتر الذمم</span><h3>إضافة ذمة يدوية</h3></div><button type="button" className="icon-button" onClick={() => setShowDebtForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>اسم الزبون *</span><input name="customer" autoFocus placeholder="اسم الزبون" required /></label><label className="field"><span>هاتف الزبون (اختياري)</span><input name="customerPhone" inputMode="tel" placeholder="091 000 0000" /></label><label className="field"><span>المبلغ (د.ل) *</span><input name="amount" type="number" min="0.01" step="0.01" required /></label><label className="field"><span>تاريخ الاستحقاق</span><input name="dueDate" type="date" /></label><label className="field field--wide"><span>ملاحظة</span><input name="note" placeholder="مثال: بضاعة اليوم" /></label></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowDebtForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><WalletCards size={17} /> حفظ الذمة</button></div></form></div>}
      {collectionDebt && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitDebtCollection} role="dialog" aria-modal="true" aria-label="تحصيل ذمة"><div className="modal-heading"><div><span className="section-kicker">تحصيل ذمة</span><h3>{collectionDebt.customerName}</h3></div><button type="button" className="icon-button" onClick={() => { setCollectionDebt(null); setCollectionAmount(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>المتبقي حاليًا</span><strong dir="ltr">{money(Math.max(0, collectionDebt.amount - collectionDebt.paid))}</strong></div><label className="field"><span>المبلغ المقبوض (د.ل)</span><input autoFocus value={collectionAmount} onChange={(event) => setCollectionAmount(event.target.value)} type="number" min="0.01" step="0.01" inputMode="decimal" required /></label><p className="modal-note">عند إدخال المبلغ المتبقي كاملًا، تنتقل الذمة تلقائيًا إلى أرشيف الذمم المسددة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setCollectionDebt(null); setCollectionAmount(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ الدفعة</button></div></form></div>}
      {showShelfLabels && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="طباعة ملصقات أسعار"><div className="modal-heading"><div><span className="section-kicker">طباعة الرفوف</span><h3>اختر ملصقات الأسعار</h3></div><button type="button" className="icon-button" onClick={() => setShowShelfLabels(false)} aria-label="إغلاق"><X size={19} /></button></div><p className="modal-note">اطبع فقط الأصناف التي تحتاج ملصقات لها، ثم اختر أي طابعة ومقاس ورق من نافذة النظام.</p><label className="field"><span>مقاس الملصق</span><select value={labelSize} onChange={(event) => setLabelSize(event.target.value as LabelSize)}>{(Object.entries(labelSizePresets) as Array<[LabelSize, typeof labelSizePresets[LabelSize]]>).map(([value, preset]) => <option key={value} value={value}>{preset.label}</option>)}</select></label><div className="notification-settings">{filteredInventory.map((product) => { const checked = selectedLabelProductIds.includes(product.id); return <button key={product.id} className={checked ? "notification-setting--on" : ""} onClick={() => setSelectedLabelProductIds((current) => checked ? current.filter((id) => id !== product.id) : [...current, product.id])}><span><strong>{product.name}</strong><small dir="ltr">{money(product.salePrice)}</small></span><i aria-label={checked ? "مختار" : "غير مختار"} /></button>; })}</div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowShelfLabels(false)}>إلغاء</button><button type="button" className="action-button action-button--primary" onClick={printShelfLabels}><Printer size={17} /> طباعة المختار ({selectedLabelProductIds.length})</button></div></section></div>}
      {receivingProduct && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={receiveSupplierBatch} role="dialog" aria-modal="true" aria-label="استلام دفعة من المورد"><div className="modal-heading"><div><span className="section-kicker">سجل استلام المورد</span><h3>{receivingProduct.name}</h3></div><button type="button" className="icon-button" onClick={() => setReceivingProduct(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>المخزون الحالي</span><strong>{receivingProduct.quantity} وحدة</strong></div><div className="form-grid"><label className="field"><span>الكمية المستلمة *</span><input name="quantity" autoFocus type="number" min="1" step="1" defaultValue="1" required /></label><label className="field"><span>سعر شراء الدفعة (د.ل) *</span><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={receivingProduct.purchasePrice} required /></label><label className="field"><span>المورد</span><input name="supplierName" defaultValue={receivingProduct.supplierName || ""} placeholder="اسم المورد" /></label><label className="field"><span>مرجع فاتورة الشراء</span><input name="purchaseInvoiceRef" maxLength={100} placeholder="مثال: INV-2026-001" /></label><label className="field"><span>تاريخ الصلاحية</span><input name="expiryDate" type="date" defaultValue={receivingProduct.expiryDate || ""} /></label><label className="field field--wide"><span>ملاحظة الاستلام</span><input name="note" placeholder="مثال: استلام جزئي أو ملاحظة البضاعة" /></label></div><p className="modal-note">يضيف سوقنا الدفعة إلى السجل ويقترح بيع الدفعات الأقرب صلاحية أولًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setReceivingProduct(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><PackagePlus size={17} /> حفظ الاستلام</button></div></form></div>}
      {editingBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitBatchEdit} role="dialog" aria-modal="true" aria-label="تعديل دفعة غير مستهلكة"><div className="modal-heading"><div><span className="section-kicker">تعديل دفعة آمن</span><h3>{editingBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setEditingBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>الدفعة غير مستهلكة</span><strong>{editingBatch.batch.remainingQuantity} / {editingBatch.batch.quantity} وحدة</strong></div><div className="form-grid"><label className="field"><span>كمية الدفعة *</span><input name="quantity" autoFocus type="number" min="1" step="1" defaultValue={editingBatch.batch.quantity} required /></label><label className="field"><span>سعر الشراء (د.ل) *</span><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={editingBatch.batch.purchasePrice} required /></label><label className="field"><span>المورد</span><input name="supplierName" defaultValue={editingBatch.batch.supplierName} /></label><label className="field"><span>مرجع فاتورة الشراء</span><input name="purchaseInvoiceRef" maxLength={100} defaultValue={editingBatch.batch.purchaseInvoiceRef || ""} /></label><label className="field"><span>تاريخ الصلاحية</span><input name="expiryDate" type="date" defaultValue={editingBatch.batch.expiryDate} /></label><label className="field field--wide"><span>ملاحظة الدفعة</span><input name="note" defaultValue={editingBatch.batch.note} /></label></div><p className="modal-note">لا يمكن تعديل أو إلغاء الدفعة بعد استهلاك أي جزء منها؛ لحماية دقة المخزون والفواتير.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setEditingBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Pencil size={17} /> حفظ التعديل</button></div></form></div>}
      {wasteApprovalBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitWasteApproval} role="dialog" aria-modal="true" aria-label="طلب اعتماد هدر دفعة منتهية"><div className="modal-heading"><div><span className="section-kicker">المرحلة الأولى</span><h3>طلب اعتماد هدر: {wasteApprovalBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setWasteApprovalBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>دفعة منتهية</span><strong>{wasteApprovalBatch.batch.remainingQuantity} وحدة · {money(wasteApprovalBatch.batch.remainingQuantity * wasteApprovalBatch.batch.purchasePrice)}</strong></div><label className="field"><span>سبب الهدر *</span><input name="reason" autoFocus required placeholder="مثال: انتهاء الصلاحية أو تلف العبوة" /></label><p className="modal-note">سيُحفظ طلب الهدر مع السبب والتكلفة، ولن تُخصم الكمية إلا بعد اعتماد نهائي منفصل.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setWasteApprovalBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ طلب الهدر</button></div></form></div>}
      {finalWasteApprovalBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitFinalWasteApproval} role="dialog" aria-modal="true" aria-label="اعتماد نهائي لهدر الدفعة"><div className="modal-heading"><div><span className="section-kicker">المرحلة الثانية</span><h3>اعتماد نهائي: {finalWasteApprovalBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setFinalWasteApprovalBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>سبب الطلب</span><strong>{finalWasteApprovalBatch.batch.wasteRequest?.reason}</strong></div><label className="field"><span>اكتب «اعتماد نهائي» للتأكيد *</span><input name="confirmation" autoFocus required placeholder="اعتماد نهائي" /></label><p className="modal-note">بعد التأكيد ستُخصم الكمية من المخزون ويُحفظ سجل الهدر بتاريخه وتكلفته.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setFinalWasteApprovalBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد نهائي</button></div></form></div>}
      {supplierReturnBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitSupplierReturn} role="dialog" aria-modal="true" aria-label="إرجاع دفعة إلى المورد"><div className="modal-heading"><div><span className="section-kicker">إرجاع إلى المورد</span><h3>{supplierReturnBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setSupplierReturnBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>{supplierReturnBatch.batch.supplierName || "المورد غير محدد"}</span><strong>{supplierReturnBatch.batch.quantity} وحدة · {money(supplierReturnBatch.batch.quantity * supplierReturnBatch.batch.purchasePrice)}</strong></div><label className="field"><span>سبب الإرجاع *</span><input name="reason" autoFocus required placeholder="مثال: خطأ في الاستلام أو تلف عند التسليم" /></label><p className="modal-note">يتاح الإرجاع فقط للدفعة غير المستهلكة بالكامل، ويُحفظ سبب العملية وتاريخها محليًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setSupplierReturnBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><ArrowLeft size={17} /> اعتماد الإرجاع</button></div></form></div>}
      {supplierPaymentSupplier && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitSupplierPayment} role="dialog" aria-modal="true" aria-label="تسجيل دفع للمورد"><div className="modal-heading"><div><span className="section-kicker">مدفوعات الموردين</span><h3>دفع إلى {supplierPaymentSupplier}</h3></div><button type="button" className="icon-button" onClick={() => setSupplierPaymentSupplier(null)} aria-label="إغلاق"><X size={19} /></button></div><label className="field"><span>المبلغ المدفوع (د.ل) *</span><input name="amount" autoFocus required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" /></label><label className="field"><span>ملاحظة الدفع</span><input name="note" placeholder="مثال: نقدًا أو رقم التحويل" /></label><p className="modal-note">سيُحفظ الدفع محليًا ضمن كشف المورد، ثم تُفتح نافذة النظام لمراجعة مستند الدفع وطباعته أو حفظه.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setSupplierPaymentSupplier(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><CircleDollarSign size={17} /> حفظ الدفع والمستند</button></div></form></div>}
      {showCashExpenseForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitCashExpense} role="dialog" aria-modal="true" aria-label="تسجيل مصروف نقدي"><div className="modal-heading"><div><span className="section-kicker">صندوق اليوم</span><h3>تسجيل مصروف نقدي</h3></div><button type="button" className="icon-button" onClick={() => setShowCashExpenseForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>المبلغ (د.ل) *</span><input name="amount" autoFocus required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" /></label><label className="field"><span>التصنيف *</span><select name="category" defaultValue="نقل"><option value="نقل">نقل</option><option value="مشتريات تشغيلية">مشتريات تشغيلية</option><option value="كهرباء أو اتصال">كهرباء أو اتصال</option><option value="صيانة">صيانة</option><option value="أخرى">أخرى</option></select></label><label className="field"><span>تاريخ المصروف</span><input name="date" type="date" defaultValue={todayKey()} /></label><label className="field"><span>ملاحظة</span><input name="note" placeholder="مثال: توصيل بضاعة أو ماء للمحل" /></label></div><p className="modal-note">يُخصم المصروف من النقد المتوقع وصافي تشغيل اليوم، ويظل محفوظًا محليًا داخل النسخة الاحتياطية.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowCashExpenseForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ المصروف</button></div></form></div>}
      {showCashClosingForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitCashClosing} role="dialog" aria-modal="true" aria-label="إغلاق وردية يومي"><div className="modal-heading"><div><span className="section-kicker">إغلاق صندوق اليوم</span><h3>اعتماد الوردية وتسويتها</h3></div><button type="button" className="icon-button" onClick={() => setShowCashClosingForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>تاريخ الوردية</span><input name="date" type="date" defaultValue={todayKey()} /></label><label className="field"><span>مسؤول الوردية (اختياري)</span><input name="responsibleName" defaultValue={todayCashClosing?.responsibleName ?? ""} placeholder="مثال: الكاشير المسائي" /></label><label className="field"><span>نقد بداية الوردية (د.ل) *</span><input name="openingCash" type="number" min="0" step="0.01" defaultValue={todayCashClosing?.openingCash ?? "0"} required /></label><label className="field"><span>النقد الفعلي اليدوي (د.ل)</span><input name="actualCash" autoFocus type="number" min="0" step="0.01" defaultValue={todayCashClosing?.actualCash ?? ""} placeholder="استخدمه عند عدم عدّ الفئات" /></label><label className="field field--wide"><span>ملاحظة الإغلاق</span><input name="note" defaultValue={todayCashClosing?.note ?? ""} placeholder="مثال: فرق بسبب فكة أو مصروف لم يسجل" /></label></div><section className="collection-summary"><span>عدّ النقد بالفئات (اختياري)</span><strong>{countedCashEntries.length ? `الإجمالي المحتسب ${money(countedCashTotal)}` : "أدخل عدد الأوراق أو العملات لتحسب تلقائيًا"}</strong><div className="form-grid">{CASH_DENOMINATIONS.map((denomination) => <label className="field" key={denomination}><span>{denomination} د.ل</span><input type="number" min="0" step="1" inputMode="numeric" value={cashDenominationCounts[denomination] ?? ""} onChange={(event) => setCashDenominationCounts((current) => ({ ...current, [denomination]: event.target.value }))} placeholder="0" /></label>)}</div></section><div className="collection-summary"><span>ملخص التسوية قبل الاعتماد</span><strong>مسؤول {todayCashClosing?.responsibleName || "غير محدد"} · نقد متوقع {money(todayCashSummary.expectedCash)} · صافي تشغيل {money(todayCashSummary.netOperatingProfit)}</strong></div><p className="modal-note">إذا أدخلت أي فئة، يعتمد سوقنا إجمالي العد بدل النقد اليدوي، ويحفظ المسؤول والتفاصيل داخل مستند الطباعة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowCashClosingForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Printer size={17} /> اعتماد وطباعة الإغلاق</button></div></form></div>}
      {showBarcodeStocktake && store.barcodeStocktakeDraft && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="جولة جرد سريع بالباركود"><div className="modal-heading"><div><span className="section-kicker">جرد سريع بالباركود</span><h3>امسح القطع أو اكتب المجموع</h3></div><button type="button" className="icon-button" onClick={() => { setShowBarcodeStocktake(false); setShowBarcodeStocktakeScanner(false); }} aria-label="إغلاق"><X size={19} /></button></div><div className="report-stats"><StatCard label="أصناف معدودة" value={`${barcodeStocktakeProgress.countedProducts}/${store.products.length}`} detail={`${barcodeStocktakeProgress.uncountedProducts} لم تعد`} icon={ClipboardList} tone="olive" /><StatCard label="وحدات مسجلة" value={String(barcodeStocktakeProgress.scannedUnits)} detail="مسح أو إدخال يدوي" icon={Camera} tone="blue" /><StatCard label="فروقات" value={String(barcodeStocktakeProgress.differences)} detail="تراجع قبل الاعتماد" icon={CircleAlert} tone={barcodeStocktakeProgress.differences ? "apricot" : "sand"} /></div><label className="field"><span>ملاحظة الجولة</span><input value={store.barcodeStocktakeDraft.note} maxLength={160} onChange={(event) => setStore((current) => current.barcodeStocktakeDraft ? { ...current, barcodeStocktakeDraft: { ...current.barcodeStocktakeDraft, note: event.target.value, updatedAt: new Date().toISOString() } } : current)} placeholder="مثال: جرد الرفوف صباحًا" /></label><div className="inventory-page__actions"><button type="button" className="action-button action-button--primary" onClick={() => setShowBarcodeStocktakeScanner(true)}><Camera size={17} /> بدء المسح المتكرر</button><button type="button" className="action-button action-button--secondary" onClick={() => void exportBarcodeStocktakeExcel()}><Download size={17} /> الجولة Excel</button><button type="button" className={`action-button action-button--secondary ${barcodeStocktakeOnlyPending ? "selected" : ""}`} onClick={() => setBarcodeStocktakeOnlyPending((current) => !current)}><ClipboardList size={17} /> غير المعدود ({barcodeStocktakeProgress.uncountedProducts})</button></div><label className="search-box"><Search size={17} /><input value={barcodeStocktakeQuery} onChange={(event) => setBarcodeStocktakeQuery(event.target.value)} placeholder="ابحث باسم أو باركود..." /></label><div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>المسجل</th><th>المعدود</th><th>الفارق</th></tr></thead><tbody>{filteredBarcodeStocktakeEntries.map((entry) => <tr key={`barcode-stocktake-${entry.id}`}><td><strong>{entry.name}</strong><small dir="ltr">{entry.sku}</small></td><td>{entry.quantity}</td><td><div className="row-actions"><input aria-label={`الكمية المعدودة ${entry.name}`} value={entry.counted ? String(entry.actualQuantity) : ""} onChange={(event) => updateBarcodeStocktakeCount(entry.id, event.target.value)} type="number" min="0" step="1" inputMode="numeric" placeholder="لم يعد" /><button type="button" className="mini-icon" onClick={() => updateBarcodeStocktakeCount(entry.id, "0")} aria-label={`تأكيد عدم وجود ${entry.name}`}>0</button></div></td><td><span className={`status-badge ${entry.difference !== null && entry.difference !== 0 ? "status-badge--warning" : ""}`}>{entry.difference === null ? "—" : `${entry.difference > 0 ? "+" : ""}${entry.difference}`}</span></td></tr>)}</tbody></table></div>{!filteredBarcodeStocktakeEntries.length && <p className="modal-note">لا توجد أصناف مطابقة لهذا العرض. ألغِ التصفية أو امسح باركود صنف آخر.</p>}<p className="modal-note">كل مسح صحيح يزيد عدّ الصنف بوحدة واحدة. عند العد بالكرتون أو الرف، اكتب الإجمالي مباشرة. لا يتغير المخزون إلا بعد عدّ كل الأصناف ثم اعتماد الجولة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setStore((current) => ({ ...current, barcodeStocktakeDraft: null })); setShowBarcodeStocktake(false); setShowBarcodeStocktakeScanner(false); }}>حذف الجولة</button><button type="button" className="action-button action-button--secondary" onClick={() => setShowBarcodeStocktake(false)}>حفظ للمتابعة لاحقًا</button><button type="button" className="action-button action-button--primary" disabled={!barcodeStocktakeProgress.completed} onClick={commitBarcodeStocktake}><Check size={17} /> اعتماد جرد الباركود</button></div></section></div>}
      {showBulkStocktake && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitBulkStocktake} role="dialog" aria-modal="true" aria-label="جرد جماعي للمخزون"><div className="modal-heading"><div><span className="section-kicker">جرد جماعي محلي</span><h3>راجع جميع الأصناف قبل الاعتماد</h3></div><button type="button" className="icon-button" onClick={() => { setShowBulkStocktake(false); setBulkStocktakeQuantities({}); }} aria-label="إغلاق"><X size={19} /></button></div><label className="field"><span>ملاحظة الجرد</span><input name="note" defaultValue="جرد جماعي" placeholder="مثال: جرد نهاية الأسبوع" /></label><div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>المسجل</th><th>الفعلي</th><th>الفارق</th></tr></thead><tbody>{store.products.map((product) => { const actualQuantity = Number(bulkStocktakeQuantities[product.id]); const difference = Number.isFinite(actualQuantity) ? actualQuantity - product.quantity : Number.NaN; return <tr key={`bulk-${product.id}`}><td><strong>{product.name}</strong><small dir="ltr">{product.sku}</small></td><td>{product.quantity}</td><td><input aria-label={`الكمية الفعلية ${product.name}`} value={bulkStocktakeQuantities[product.id] ?? ""} onChange={(event) => setBulkStocktakeQuantities((current) => ({ ...current, [product.id]: event.target.value }))} type="number" min="0" step="1" inputMode="numeric" required /></td><td><span className={`status-badge ${Number.isFinite(difference) && difference !== 0 ? "status-badge--warning" : ""}`}>{Number.isFinite(difference) ? `${difference > 0 ? "+" : ""}${difference}` : "—"}</span></td></tr>; })}</tbody></table></div><p className="modal-note">لن تُحدّث الكميات إلا بعد اعتماد النموذج. سيُسجل لكل صنف الرصيد المسجل والفعلي والفارق وقيمته بسعر الشراء.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setShowBulkStocktake(false); setBulkStocktakeQuantities({}); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد الجرد الجماعي</button></div></form></div>}
      {pendingProtectedAction && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={verifySensitiveAction} role="dialog" aria-modal="true" aria-label="تأكيد العملية الحساسة"><div className="modal-heading"><div><span className="section-kicker">قفل محلي</span><h3>{pendingProtectedAction.title}</h3></div><button type="button" className="icon-button" onClick={() => { setPendingProtectedAction(null); setActionLockPin(""); }} aria-label="إغلاق"><X size={19} /></button></div><p className="modal-note">أدخل رمز القفل المحلي لتنفيذ العملية. لا يُرسل هذا الرمز إلى الإنترنت.</p><label className="field"><span>رمز القفل</span><input value={actionLockPin} onChange={(event) => setActionLockPin(event.target.value.replace(/\D/g, "").slice(0, 8))} type="password" inputMode="numeric" autoFocus required /></label><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setPendingProtectedAction(null); setActionLockPin(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><ShieldCheck size={17} /> تأكيد العملية</button></div></form></div>}
      {stocktakeProduct && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitStocktake} role="dialog" aria-modal="true" aria-label="جرد صنف بالكاميرا"><div className="modal-heading"><div><span className="section-kicker">جرد بالكاميرا</span><h3>{stocktakeProduct.name}</h3></div><button type="button" className="icon-button" onClick={() => { setStocktakeProduct(null); setStocktakeQuantity(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>الكمية المسجلة</span><strong>{stocktakeProduct.quantity} وحدة</strong></div><label className="field"><span>الكمية الفعلية بعد الجرد</span><input autoFocus value={stocktakeQuantity} onChange={(event) => setStocktakeQuantity(event.target.value)} type="number" min="0" step="1" inputMode="numeric" required /></label><p className="modal-note">قارن الكمية الفعلية بما في المخزون، ثم احفظ لتحديث رصيد الصنف محليًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setStocktakeProduct(null); setStocktakeQuantity(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد الجرد</button></div></form></div>}
      {returningSale && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitSaleReturn} role="dialog" aria-modal="true" aria-label="إرجاع بيع جزئي"><div className="modal-heading"><div><span className="section-kicker">إرجاع بيع جزئي</span><h3>فاتورة #{returningSale.id.slice(-5)}</h3></div><button type="button" className="icon-button" onClick={() => { setReturningSale(null); setReturnQuantities({}); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>قيمة الفاتورة الأصلية</span><strong dir="ltr">{money(returningSale.total)}</strong></div><div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>المباع</th><th>سبق إرجاعه</th><th>المتبقي</th><th>كمية الإرجاع</th></tr></thead><tbody>{getSaleReturnableItems(returningSale, store.sales).map((entry) => { const item = returningSale.items.find((candidate) => candidate.productId === entry.productId); return <tr key={`partial-return-${entry.productId}`}><td><strong>{item?.name || "صنف"}</strong></td><td>{entry.soldQuantity}</td><td>{entry.returnedQuantity}</td><td><b>{entry.remainingQuantity}</b></td><td><input aria-label={`كمية إرجاع ${item?.name || entry.productId}`} value={returnQuantities[entry.productId] ?? "0"} onChange={(event) => setReturnQuantities((current) => ({ ...current, [entry.productId]: event.target.value }))} type="number" min="0" max={entry.remainingQuantity} step="1" inputMode="numeric" /></td></tr>; })}</tbody></table></div><label className="field"><span>سبب الإرجاع *</span><input name="reason" autoFocus required placeholder="مثال: خطأ في الفاتورة أو إرجاع الزبون" /></label><p className="modal-note">يمكنك إرجاع جزء من الفاتورة فقط. تُعاد الكمية المختارة إلى المخزون وتُحسب قيمتها بعد الخصم النسبي، ولا يمكن تجاوز المتبقي من كل صنف.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setReturningSale(null); setReturnQuantities({}); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Undo2 size={17} /> اعتماد الإرجاع الجزئي</button></div></form></div>}
      {returnCartSale && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="سلة إرجاع بيع"><div className="modal-heading"><div><span className="section-kicker">سلة إرجاع</span><h3>فاتورة #{returnCartSale.id.slice(-5)}</h3></div><button type="button" className="icon-button" onClick={() => { setReturnCartSale(null); setReturnQuantities({}); setReturnCartReason(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>الفاتورة الأصلية</span><strong dir="ltr">{money(returnCartSale.total)}</strong></div><div className="pos-layout"><section className="product-browser panel"><div className="panel-heading"><div><span className="section-kicker">أصناف الفاتورة</span><h3>أضف إلى سلة الإرجاع</h3></div><span className="status-badge">المتاح فقط</span></div><div className="product-grid">{returnCartAvailableItems.map((entry) => { const item = returnCartSale.items.find((candidate) => candidate.productId === entry.productId); const selectedQuantity = Number(returnQuantities[entry.productId]) || 0; return <button type="button" className="product-tile" key={`return-source-${entry.productId}`} disabled={entry.remainingQuantity <= selectedQuantity} onClick={() => updateReturnCartQuantity(entry.productId, 1)}><span className="product-tile__category">متاح {entry.remainingQuantity} · سبق إرجاعه {entry.returnedQuantity}</span><strong>{item?.name || "صنف"}</strong><div><b dir="ltr">{money(item?.price || 0)}</b><small>{entry.remainingQuantity <= selectedQuantity ? "بلغت الحد المتاح" : "اضغط للإضافة"}</small></div></button>; })}</div>{!returnCartAvailableItems.some((entry) => entry.remainingQuantity > 0) && <EmptyState icon={Undo2} title="لا توجد كميات متاحة للإرجاع" description="هذه الفاتورة أُرجعت كليًا أو لا يمكن إرجاعها الآن." />}</section><aside className="cart-panel"><div className="cart-panel__head"><div><span className="section-kicker">الإرجاع الحالي</span><h3>سلة الإرجاع</h3></div><span className="cart-count">{returnCartItems.reduce((total, item) => total + item.quantity, 0)}</span></div><div className="cart-items">{returnCartItems.length ? returnCartItems.map((item) => <div className="cart-item" key={`return-cart-${item.productId}`}><div className="cart-item__info"><strong>{item.name}</strong><small dir="ltr">{money(item.price)} للوحدة</small></div><div className="quantity-controls"><button type="button" onClick={() => updateReturnCartQuantity(item.productId, -1)} aria-label={`تقليل إرجاع ${item.name}`}><Minus size={15} /></button><b>{item.quantity}</b><button type="button" onClick={() => updateReturnCartQuantity(item.productId, 1)} aria-label={`زيادة إرجاع ${item.name}`}><Plus size={15} /></button></div><b className="cart-item__total" dir="ltr">{money(item.quantity * item.price)}</b><button type="button" className="mini-icon mini-icon--danger" onClick={() => setReturnQuantities((current) => ({ ...current, [item.productId]: "0" }))} aria-label={`حذف ${item.name} من سلة الإرجاع`}><Trash2 size={15} /></button></div>) : <EmptyState icon={Undo2} title="سلة الإرجاع فارغة" description="اضغط على أصناف الفاتورة لإضافتها إلى السلة." />}</div><label className="customer-field"><span>سبب الإرجاع *</span><input value={returnCartReason} onChange={(event) => setReturnCartReason(event.target.value)} placeholder="مثال: إرجاع الزبون أو خطأ بالفاتورة" /></label><div className="cart-total"><div><span>إجمالي التسوية</span><small>يحسب بعد خصم الفاتورة النسبي</small></div><strong dir="ltr">{money(returnCartTotal)}</strong></div><button type="button" className="action-button action-button--checkout" disabled={!returnCartItems.length} onClick={commitReturnCart}><Undo2 size={19} /> اعتماد الإرجاع</button></aside></div><p className="modal-note">لن تتجاوز السلة الكميات المتاحة للإرجاع. عند الاعتماد تعود الكميات إلى المخزون، وتُخفض الذمة إن كانت الفاتورة آجلة، ويُحفظ سبب الإرجاع محليًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setReturnQuantities(Object.fromEntries(returnCartAvailableItems.map((item) => [item.productId, "0"])))}>تفريغ السلة</button><button type="button" className="action-button action-button--secondary" onClick={() => { setReturnCartSale(null); setReturnQuantities({}); setReturnCartReason(""); }}>إلغاء</button></div></section></div>}
      {showBarcodeScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowBarcodeScanner(false)} />}
      {showStocktakeScanner && <BarcodeScanner onDetected={handleStocktakeBarcodeDetected} onClose={() => setShowStocktakeScanner(false)} />}
      {showBarcodeStocktakeScanner && <BarcodeScanner continuous kicker="جولة جرد سريع" heading="امسح البضائع لتسجيل العدّ" closeLabel="العودة إلى جولة الجرد" onDetected={handleBarcodeStocktakeDetected} onClose={() => setShowBarcodeStocktakeScanner(false)} />}
      {showStoreSetup && <div className="modal-backdrop store-setup-backdrop" role="presentation"><form className="store-setup-card" onSubmit={finishStoreSetup} role="dialog" aria-modal="true" aria-label="إعداد محل جديد"><div className="store-setup-mark"><img src={logoUrl} alt="رمز سوقنا" /></div><span className="section-kicker">إعداد حقيقي لمحلّك</span><h2>لن نضيف أي أصناف<br/>بدلًا <em>عنك.</em></h2><p>ابدأ باسم محلك، ثم أضف أول صنف من مخزونك الفعلي. كل فاتورة وكمية وذمة تُحفظ محليًا على هذا الجهاز.</p><label className="field"><span>اسم المحل *</span><input name="storeName" autoFocus placeholder="مثال: بقالة الندى" required /></label><button className="action-button action-button--primary store-setup-submit" type="submit"><Store size={18} /> حفظ الاسم وإضافة أول صنف</button><small><WifiOff size={14} /> لا توجد بيانات تجريبية ولا يلزم اتصال بالإنترنت.</small></form></div>}
    </div>
  );
}
