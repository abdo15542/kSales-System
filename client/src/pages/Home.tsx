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
  ShoppingBag,
  Store,
  Trash2,
  TrendingUp,
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
import { buildShelfLabelsPrintHtml } from "@/lib/shelfLabels";
import { createCode128Svg, getPrintableBarcodeValue } from "@/lib/labelBarcode";
import { getInactiveProducts, getMonthlyReport } from "@/lib/monthlyOperations";
import { calculateSaleTotals } from "@/lib/saleTotals";
import { buildPriceChangeDrafts, isSettledDebt, type PriceChangeField } from "@/lib/storeHistory";
import BarcodeScanner from "@/components/BarcodeScanner";

type Page = "dashboard" | "sale" | "inventory" | "debts" | "reports" | "settings";
type PaymentMethod = "cash" | "credit";
type NotificationKind = "critical" | "warning" | "info";

type NotificationPreferences = {
  stock: boolean;
  debts: boolean;
  backup: boolean;
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
};

type CartItem = Product & { cartQuantity: number };

type Sale = {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number; cost: number }>;
  total: number;
  profit: number;
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
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
  storeName: string;
  storePhone: string;
  receiptLogo: string;
  defaultDiscountPercent: number;
  initialized: boolean;
};

const STORAGE_KEY = "souqna-local-store-v1";
const NOTIFICATION_SETTINGS_KEY = "souqna-notification-settings-v1";
const NOTIFICATION_READ_KEY = "souqna-read-notifications-v1";
const PRINTER_SETTINGS_KEY = "souqna-printer-settings-v1";
const BACKUP_EXPORTED_AT_KEY = "souqna-backup-exported-at-v1";
const STOCKTAKE_SETTINGS_KEY = "souqna-stocktake-settings-v1";
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

function normalizeStore(input: Partial<StoreData> | null): StoreData {
  if (!input) return emptyStoreData;
  const realProducts = Array.isArray(input.products) ? input.products.filter((product) => !demoProductIds.has(product.id)).map((product) => ({ ...product, imageDataUrl: isLocalProductImage(product.imageDataUrl) ? product.imageDataUrl : undefined })) : [];
  const realSales = Array.isArray(input.sales) ? input.sales
    .map((sale) => ({ ...sale, items: Array.isArray(sale.items) ? sale.items.filter((item) => !demoProductIds.has(item.productId)) : [] }))
    .filter((sale) => sale.items.length > 0) : [];
  return {
    products: realProducts,
    sales: realSales,
    debts: Array.isArray(input.debts) ? input.debts : [],
    priceHistory: Array.isArray(input.priceHistory) ? input.priceHistory.filter((entry): entry is PriceHistoryEntry => Boolean(entry && typeof entry.productId === "string" && typeof entry.productName === "string" && (entry.field === "purchasePrice" || entry.field === "salePrice") && Number.isFinite(entry.previous) && Number.isFinite(entry.next) && typeof entry.createdAt === "string")) : [],
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
    return { stock: true, debts: true, backup: true, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { stock: true, debts: true, backup: true };
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
  const [collectionAmount, setCollectionAmount] = useState("");
  const [priceHistoryProductId, setPriceHistoryProductId] = useState<string | null>(null);
  const [showStoreSetup, setShowStoreSetup] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showStocktakeScanner, setShowStocktakeScanner] = useState(false);
  const [stocktakeProduct, setStocktakeProduct] = useState<Product | null>(null);
  const [stocktakeQuantity, setStocktakeQuantity] = useState("");
  const [stocktakeSettings, setStocktakeSettings] = useState<StocktakeSettings>(readStocktakeSettings);
  const [showShelfLabels, setShowShelfLabels] = useState(false);
  const [selectedLabelProductIds, setSelectedLabelProductIds] = useState<string[]>([]);
  const [pendingBarcode, setPendingBarcode] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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
  const profitToday = useMemo(() => todaySales.reduce((total, sale) => total + sale.profit, 0), [todaySales]);
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
  const recurringCustomers = useMemo(() => getRecurringCustomers(store.sales, store.debts), [store.sales, store.debts]);
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
  }, [inactiveProducts, lastBackupAt, lowStock, nearDepletion, notificationPreferences, store.debts]);
  const unreadNotificationCount = useMemo(() => notifications.filter((notification) => !readNotificationKeys.includes(notification.id)).length, [notifications, readNotificationKeys]);
  const saleTotals = useMemo(() => calculateSaleTotals(
    cart.reduce((total, item) => total + item.salePrice * item.cartQuantity, 0),
    cart.reduce((total, item) => total + item.purchasePrice * item.cartQuantity, 0),
    store.defaultDiscountPercent,
  ), [cart, store.defaultDiscountPercent]);
  const { subtotal: cartSubtotal, discountPercent: cartDiscountPercent, discountAmount: cartDiscountAmount, total: cartTotal, profit: cartProfit } = saleTotals;
  const filteredSaleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return store.products.filter((product) => product.quantity > 0 && (!term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)));
  }, [store.products, query]);
  const filteredInventory = useMemo(() => store.products.filter((product) => product.name.includes(inventoryQuery.trim()) || product.sku.includes(inventoryQuery.trim())), [store.products, inventoryQuery]);
  const itemSales = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    monthSales.forEach((sale) => sale.items.forEach((item) => {
      const existing = map.get(item.productId) ?? { name: item.name, quantity: 0, revenue: 0 };
      map.set(item.productId, { name: item.name, quantity: existing.quantity + item.quantity, revenue: existing.revenue + item.quantity * item.price });
    }));
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [monthSales]);

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

  const handleBarcodeDetected = useCallback((barcode: string) => {
    setShowBarcodeScanner(false);
    const product = store.products.find((item) => item.sku.trim().toLowerCase() === barcode.trim().toLowerCase());
    if (product) {
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
      invoiceHtml: `<p>فاتورة رقم ${sale.id.slice(-5)} · ${formatDate(sale.createdAt)}</p>`,
      rowsHtml: rows,
      subtotalHtml: sale.subtotal !== undefined ? `<div class="summary-line"><span>المجموع</span><span>${money(sale.subtotal)}</span></div>` : "",
      discountHtml: discountLine,
      totalHtml: `<div class="total"><span>الإجمالي</span><span>${money(sale.total)}</span></div>`,
      qrHtml: qrBlock,
      footerHtml: `<p class="foot"><span class="tag">${sale.paymentMethod === "cash" ? "نقدًا" : "آجل"}</span><br/>شكرًا لتسوقكم معنا${phoneLine}</p>`,
    });
    openSystemPrint(`فاتورة ${sale.id.slice(-5)}`, receiptContent, receiptWindow);
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
    const printed = openSystemPrint(`ملصقات أسعار ${store.storeName}`, buildShelfLabelsPrintHtml(store.storeName, products, money, barcodeSvgs));
    if (printed) {
      setShowShelfLabels(false);
      toast.success("فُتحت نافذة طباعة الملصقات. اختر طابعتك ومقاس الورق من النظام.");
    }
  };

  const completeSale = () => {
    if (!cart.length) {
      toast.error("أضف صنفًا واحدًا على الأقل إلى السلة.");
      return;
    }
    if (paymentMethod === "credit" && !customerName.trim()) {
      toast.error("اكتب اسم الزبون لتسجيل الذمة.");
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
      paymentMethod,
      customerName: paymentMethod === "credit" ? customerName.trim() : undefined,
      customerPhone: paymentMethod === "credit" ? customerPhone.trim() || undefined : undefined,
    };
    setStore((current) => ({
      ...current,
      sales: [sale, ...current.sales],
      products: current.products.map((product) => {
        const item = cart.find((candidate) => candidate.id === product.id);
        return item ? { ...product, quantity: product.quantity - item.cartQuantity } : product;
      }),
      debts: paymentMethod === "credit" ? [{ id: makeId("debt"), customerName: customerName.trim(), customerPhone: customerPhone.trim() || undefined, amount: cartTotal, paid: 0, createdAt: sale.createdAt, dueDate: "", note: `فاتورة رقم ${sale.id.slice(-5)}` }, ...current.debts] : current.debts,
    }));
    setLatestSale(sale);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    toast.success(paymentMethod === "credit" ? "تم حفظ البيع والذمة." : "تم تسجيل البيع بنجاح.");
  };

  const saveProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
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
    };
    if (!product.name || [product.quantity, product.lowStockAt, product.purchasePrice, product.salePrice].some(Number.isNaN)) {
      toast.error("أكمل بيانات الصنف المطلوبة.");
      return;
    }
    const addingFirstProduct = store.products.length === 0 && !editingProduct;
    setStore((current) => {
      const priceChanges = buildPriceChangeDrafts(editingProduct, product).map((change) => ({
        id: makeId("price"),
        productId: product.id,
        productName: product.name,
        ...change,
        createdAt: new Date().toISOString(),
      }));
      return {
        ...current,
        products: editingProduct ? current.products.map((item) => item.id === editingProduct.id ? product : item) : [product, ...current.products],
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
    if (!window.confirm(`سيُحذف «${product.name}» من المخزون الحالي فقط. ستبقى كل الفواتير السابقة كما هي. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }));
    setCart((current) => current.filter((item) => item.id !== product.id));
    toast.success("تم حذف الصنف من المخزون الحالي مع الاحتفاظ بسجل الفواتير.");
  };

  const addInventoryQuantity = (product: Product) => {
    const added = Number(window.prompt(`إضافة كمية إلى ${product.name}:`, "1"));
    if (added > 0) {
      setStore((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + added } : item) }));
      toast.success("تم تحديث الكمية.");
    }
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
    setStore((current) => ({ ...current, products: current.products.map((product) => product.id === stocktakeProduct.id ? { ...product, quantity: actualQuantity } : product) }));
    setStocktakeProduct(null);
    setStocktakeQuantity("");
    toast.success(difference === 0 ? "تم تأكيد الجرد؛ الكمية مطابقة للمخزون." : `تم تحديث الكمية بعد الجرد: ${difference > 0 ? "+" : ""}${difference} وحدة.`);
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
    setStore((current) => ({ ...current, debts: current.debts.map((item) => item.id === collectionDebt.id ? { ...item, paid: Math.min(item.amount, item.paid + value) } : item) }));
    const settlesDebt = value >= outstanding;
    setCollectionDebt(null);
    setCollectionAmount("");
    toast.success(settlesDebt ? "تم تحصيل الذمة بالكامل ونقلها إلى الأرشيف." : "تم تسجيل الدفعة.");
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
      { "المؤشر": "مبيعات الشهر", "القيمة (د.ل)": monthRevenue },
      { "المؤشر": "ربح الشهر", "القيمة (د.ل)": monthProfit },
      { "المؤشر": "الذمم المستحقة", "القيمة (د.ل)": totalOutstanding },
      { "المؤشر": "قيمة المخزون بسعر الشراء", "القيمة (د.ل)": store.products.reduce((total, product) => total + product.quantity * product.purchasePrice, 0) },
    ];
    const salesRows = store.sales.flatMap((sale) => sale.items.map((item) => ({ "رقم الفاتورة": sale.id.slice(-5), "التاريخ": sale.createdAt, "طريقة الدفع": sale.paymentMethod === "cash" ? "نقدًا" : "آجل", "الزبون": sale.customerName ?? "", "الصنف": item.name, "الكمية": item.quantity, "سعر الوحدة": item.price, "الإجمالي": item.price * item.quantity, "الربح": (item.price - item.cost) * item.quantity })));
    const productRows = store.products.map((product) => ({ "اسم الصنف": product.name, "رمز الصنف": product.sku, "التصنيف": product.category, "الكمية": product.quantity, "حد التنبيه": product.lowStockAt, "سعر الشراء": product.purchasePrice, "سعر البيع": product.salePrice }));
    const debtRows = store.debts.map((debt) => ({ "الزبون": debt.customerName, "إجمالي الذمة": debt.amount, "المدفوع": debt.paid, "المتبقي": Math.max(0, debt.amount - debt.paid), "تاريخ الاستحقاق": debt.dueDate, "ملاحظة": debt.note }));
    const workbook = XLSX.utils.book_new();
    const reportSheets: Array<[string, Record<string, unknown>[]]> = [["ملخص", summary], ["الفواتير", salesRows], ["المخزون", productRows], ["الذمم", debtRows]];
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
    const templateRows = [{ "اسم الصنف": "", "رمز الصنف": "", "التصنيف": "عام", "الكمية": 0, "حد التنبيه": 5, "سعر الشراء": 0, "سعر البيع": 0 }];
    const sheet = XLSX.utils.json_to_sheet(templateRows);
    sheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 15 }];
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
        const quantity = excelNumber(pickColumn(row, ["الكمية", "quantity", "Quantity"]));
        const lowStockAt = excelNumber(pickColumn(row, ["حد التنبيه", "الحد الأدنى", "lowStockAt", "Low Stock", "low stock"]));
        const purchasePrice = excelNumber(pickColumn(row, ["سعر الشراء", "purchasePrice", "Purchase Price", "cost"]));
        const salePrice = excelNumber(pickColumn(row, ["سعر البيع", "salePrice", "Sale Price", "price"]));
        if (!name || !sku || [quantity, lowStockAt, purchasePrice, salePrice].some((value) => !Number.isFinite(value) || value < 0)) { rejected += 1; return; }
        received.set(sku.toLowerCase(), { name, sku, category, quantity, lowStockAt, purchasePrice, salePrice });
      });
      const items = Array.from(received.values());
      if (!items.length) throw new Error("كل الصفوف غير صالحة");
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
            const nextProduct = { ...currentProduct, ...item };
            products[index] = nextProduct;
            buildPriceChangeDrafts(currentProduct, nextProduct).forEach((change) => priceHistory.push({ id: makeId("price"), productId: currentProduct.id, productName: nextProduct.name, ...change, createdAt: new Date().toISOString() }));
            updated += 1;
          } else products.unshift({ id: makeId("product"), ...item });
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
          <div><strong>سوقنا</strong><span>دفتر محلك الذكي</span></div>
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
                <StatCard label="ذمم مستحقة" value={money(totalOutstanding)} detail={`${store.debts.filter((debt) => debt.amount > debt.paid).length} زبون بانتظار السداد`} icon={WalletCards} tone="apricot" />
                <StatCard label="تنبيهات المخزون" value={`${lowStock.length} أصناف`} detail={lowStock.length ? "تحتاج متابعة الآن" : "المخزون في وضع جيد"} icon={BellRing} tone="sand" />
              </div>

              <div className="dashboard-columns">
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
                  <div className="sale-search-row"><label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الباركود..." /></label><button className="scan-button" onClick={() => setShowBarcodeScanner(true)} aria-label="مسح باركود بالكاميرا"><Camera size={18} /></button></div>
                  <div className="product-grid">
                    {filteredSaleProducts.map((product) => <button className="product-tile" key={product.id} onClick={() => addToCart(product)}>{product.imageDataUrl && <img className="product-tile__image" src={product.imageDataUrl} alt="" />}<span className="product-tile__category">{product.category}</span><strong>{product.name}</strong><div><b dir="ltr">{money(product.salePrice)}</b><small>{product.quantity} متوفر</small></div><span className={`stock-dot ${product.quantity <= product.lowStockAt ? "stock-dot--low" : ""}`} /></button>)}
                  </div>
                  {!filteredSaleProducts.length && <EmptyState icon={Box} title={store.products.length ? "لا توجد أصناف مطابقة" : "لم تضف أصنافًا بعد"} description={store.products.length ? "جرّب بحثًا مختلفًا أو أضف صنفًا جديدًا." : "أضف أصناف مخزونك الحقيقي قبل إنشاء أي فاتورة."} action={!store.products.length ? <button className="text-button text-button--strong" onClick={() => openProductForm()}>إضافة أول صنف <ArrowLeft size={16} /></button> : undefined} />}
                </section>

                <aside className="cart-panel">
                  <div className="cart-panel__head"><div><span className="section-kicker">الفاتورة الحالية</span><h3>سلة البيع</h3></div><span className="cart-count">{cart.reduce((count, item) => count + item.cartQuantity, 0)}</span></div>
                  <div className="cart-items">
                    {cart.length ? cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item__info"><strong>{item.name}</strong><small dir="ltr">{money(item.salePrice)} للوحدة</small></div><div className="quantity-controls"><button onClick={() => changeCartQuantity(item.id, -1)} aria-label="تقليل الكمية"><Minus size={15} /></button><b>{item.cartQuantity}</b><button onClick={() => changeCartQuantity(item.id, 1)} aria-label="زيادة الكمية"><Plus size={15} /></button></div><b className="cart-item__total" dir="ltr">{money(item.salePrice * item.cartQuantity)}</b><button className="mini-icon mini-icon--danger" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))} aria-label="إزالة الصنف"><Trash2 size={15} /></button></div>) : <EmptyState icon={ShoppingBag} title="السلة فارغة" description="اختر الأصناف من القائمة لإضافتها إلى هذه الفاتورة." />}
                  </div>
                  <div className="payment-method"><p>طريقة الدفع</p><div><button className={paymentMethod === "cash" ? "selected" : ""} onClick={() => setPaymentMethod("cash")}><CircleDollarSign size={17} /> نقدًا</button><button className={paymentMethod === "credit" ? "selected" : ""} onClick={() => setPaymentMethod("credit")}><UserRound size={17} /> آجل / ذمة</button></div>{paymentMethod === "credit" && <div className="customer-picker"><label className="customer-field"><UserRound size={16} /><input list="souqna-recurring-customers" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="اسم الزبون" /></label><label className="customer-field"><span>هاتف</span><input value={customerPhone} inputMode="tel" onChange={(event) => setCustomerPhone(event.target.value)} placeholder="هاتف الزبون (اختياري)" /></label><datalist id="souqna-recurring-customers">{recurringCustomers.map((customer) => <option key={customer.name} value={customer.name} />)}</datalist>{recurringCustomers.length > 0 && <div className="customer-chips"><small>زبائن متكررون</small><div>{recurringCustomers.slice(0, 5).map((customer) => <button type="button" key={customer.name} onClick={() => setCustomerName(customer.name)}>{customer.name}{customer.outstanding > 0 && <i>{money(customer.outstanding)}</i>}</button>)}</div></div>}</div>}</div>
                  <div className="cart-total"><div><span>{cartDiscountAmount > 0 ? "الإجمالي بعد الخصم" : "الإجمالي"}</span>{cartDiscountAmount > 0 && <small>خصم افتراضي {cartDiscountPercent}%: -{money(cartDiscountAmount)}</small>}<small>ربح متوقع: {money(cartProfit)}</small></div><strong dir="ltr">{money(cartTotal)}</strong></div>
                  <button className="action-button action-button--checkout" disabled={!cart.length} onClick={completeSale}><Check size={19} /> تأكيد البيع</button>
                  <p className="cart-footnote"><Printer size={14} /> بعد التأكيد يمكنك طباعة الفاتورة عبر طابعتك المرتبطة بالبلوتوث.</p>
                </aside>
              </div>
              {latestSale && <div className="sale-success"><span><Check size={18} /></span><p>تم حفظ فاتورة بقيمة <b dir="ltr">{money(latestSale.total)}</b></p><button onClick={() => void downloadReceiptPdf(latestSale)}><Download size={16} /> تنزيل PDF</button><button onClick={() => printReceipt(latestSale)}><Printer size={16} /> طباعة الفاتورة</button><button className="sale-success__dismiss" onClick={() => setLatestSale(null)} aria-label="إخفاء"><X size={17} /></button></div>}
            </section>
          )}

          {page === "inventory" && (
            <section className="inventory-page">
              <div className="page-intro"><div><span className="eyebrow"><Archive size={15} /> إدارة المنتجات</span><h2>مخزونك، واضح <em>دائمًا.</em></h2><p>أضف أصنافك وحدد حد التنبيه لكل صنف؛ سيتابع سوقنا الكميات بعد كل بيع.</p></div><div className="inventory-page__actions"><input className="hidden-input" ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={(event) => void importExcelProducts(event.target.files?.[0])} /><button className="action-button action-button--secondary" onClick={() => setShowStocktakeScanner(true)}><Camera size={17} /> جرد بالكاميرا</button><button className="action-button action-button--secondary" onClick={() => { setSelectedLabelProductIds(filteredInventory.map((product) => product.id)); setShowShelfLabels(true); }}><Printer size={17} /> ملصقات أسعار</button><button className="action-button action-button--secondary" onClick={() => void downloadExcelTemplate()}><FileText size={17} /> قالب Excel</button><button className="action-button action-button--secondary" onClick={() => excelInputRef.current?.click()}><Upload size={17} /> استيراد Excel</button><button className="action-button action-button--primary" onClick={() => openProductForm()}><PackagePlus size={18} /> إضافة صنف</button></div></div>
              <div className="inventory-summary"><div><span>إجمالي الأصناف</span><b>{store.products.length}</b></div><div><span>وحدات بالمخزون</span><b>{store.products.reduce((total, product) => total + product.quantity, 0)}</b></div><div><span>قيمة المخزون (شراء)</span><b dir="ltr">{money(store.products.reduce((total, product) => total + product.quantity * product.purchasePrice, 0))}</b></div><div className={lowStock.length ? "warning" : "safe"}><span>تحتاج إعادة طلب</span><b>{lowStock.length}</b></div></div>
              {inactiveProducts.length > 0 && <section className="panel weekly-report-strip"><div><span className="section-kicker">متابعة الحركة</span><h3>{inactiveProducts.length} أصناف بلا حركة</h3><p>{inactiveProducts.slice(0, 3).map(({ product }) => product.name).join(" · ")}{inactiveProducts.length > 3 ? " · وغيرها" : ""}</p></div><button className="action-button action-button--secondary" onClick={() => setActivePage("reports")}><BarChart3 size={17} /> فتح التقرير الشهري</button></section>}
              <section className="weekly-report-strip"><div><span className="section-kicker">جرد أسبوعي محلي</span><h3>{stocktakeDue ? "موعد الجرد اليوم" : "موعد الجرد مضبوط"}</h3><p>{stocktakeDue ? "راجِع الأصناف ثم اعتمد جرد الأسبوع بعد الانتهاء." : stocktakeSettings.lastCompletedAt ? `آخر اعتماد: ${formatDate(stocktakeSettings.lastCompletedAt)}` : "سيظهر التذكير عند حلول اليوم المحدد."}</p></div><div className="inventory-page__actions"><label className="field"><span>يوم الجرد</span><select value={stocktakeSettings.weekday} onChange={(event) => setStocktakeSettings((current) => ({ ...current, weekday: Number(event.target.value) }))}><option value="0">الأحد</option><option value="1">الاثنين</option><option value="2">الثلاثاء</option><option value="3">الأربعاء</option><option value="4">الخميس</option><option value="5">الجمعة</option><option value="6">السبت</option></select></label><button className="action-button action-button--secondary" onClick={completeWeeklyStocktake}><Check size={17} /> اعتماد جرد الأسبوع</button></div></section>
              <section className="panel inventory-table-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">قائمة الأصناف</span><h3>المخزون الحالي</h3></div><label className="search-box search-box--small"><Search size={17} /><input value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} placeholder="ابحث باسم أو رمز..." /></label></div>
                <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>الرمز</th><th>المتوفر</th><th>سعر الشراء</th><th>سعر البيع</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{filteredInventory.map((product) => { const low = product.quantity <= product.lowStockAt; return <tr key={product.id}><td><div className="product-cell">{product.imageDataUrl ? <img src={product.imageDataUrl} alt="" /> : <span>{product.name.slice(0, 1)}</span>}<div><strong>{product.name}</strong><small>{product.category}</small></div></div></td><td dir="ltr">{product.sku}</td><td><b className={low ? "low-number" : ""}>{product.quantity}</b><small> / حد {product.lowStockAt}</small></td><td dir="ltr">{money(product.purchasePrice)}</td><td dir="ltr">{money(product.salePrice)}</td><td><span className={`status-badge ${low ? "status-badge--warning" : ""}`}>{low ? "منخفض" : "متوفر"}</span></td><td><div className="row-actions"><button className="mini-icon" onClick={() => addInventoryQuantity(product)} aria-label="إضافة كمية"><Plus size={16} /></button><button className="mini-icon" onClick={() => setPriceHistoryProductId(product.id)} aria-label="سجل الأسعار"><History size={15} /></button><button className="mini-icon" onClick={() => openProductForm(product)} aria-label="تعديل الصنف"><Pencil size={15} /></button><button className="mini-icon mini-icon--danger" onClick={() => deleteProduct(product)} aria-label="حذف الصنف"><Trash2 size={15} /></button></div></td></tr>})}</tbody></table></div>
                {!filteredInventory.length && <EmptyState icon={Archive} title="المخزون فارغ" description="أضف أول صنف لتبدأ متابعة منتجات محلك." />}
                {priceHistoryProductId && <section className="price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل الأسعار</span><h3>{store.products.find((product) => product.id === priceHistoryProductId)?.name || "صنف"}</h3></div><button className="text-button" onClick={() => setPriceHistoryProductId(null)}>إغلاق</button></div>{selectedProductPriceHistory.length ? <div className="price-history-list">{selectedProductPriceHistory.map((entry) => <div className="price-history-row" key={entry.id}><span>{entry.field === "purchasePrice" ? "سعر الشراء" : "سعر البيع"}</span><b dir="ltr">{money(entry.previous)}</b><ArrowLeft size={15} /><strong dir="ltr">{money(entry.next)}</strong><small>{formatDate(entry.createdAt)}</small></div>)}</div> : <EmptyState icon={History} title="لا توجد تغييرات مسجلة" description="سيظهر هنا كل تعديل لاحق على سعر الشراء أو البيع لهذا الصنف." />}</section>}
              </section>
            </section>
          )}

          {page === "debts" && (
            <section className="debts-page">
              <div className="page-intro"><div><span className="eyebrow"><WalletCards size={15} /> متابعة الزبائن</span><h2>دفتر الذمم، <em>من دون ورق.</em></h2><p>كل عملية آجلة تسجل تلقائيًا. أضف ذمة يدوية أو سجل دفعة عندما يسدد الزبون.</p></div><button className="action-button action-button--primary" onClick={() => setShowDebtForm(true)}><Plus size={18} /> إضافة ذمة</button></div>
              <div className="debt-overview"><div className="debt-overview__total"><span>إجمالي المبلغ المستحق</span><strong dir="ltr">{money(totalOutstanding)}</strong><small>لدى {store.debts.filter((debt) => debt.amount > debt.paid).length} زبون</small></div><div className="debt-overview__hint"><CircleAlert size={22} /><p>حافظ على التواصل: الذمة الواضحة تحمي علاقتك بالزبون وتساعدك على التخطيط للشراء.</p></div></div>
              <section className="panel debt-list-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">سجل الذمم</span><h3>{showSettledDebts ? "أرشيف الذمم المسددة" : "المبالغ القائمة"}</h3></div><div className="debt-list-tools"><label className="search-box search-box--small"><Search size={17} /><input value={debtQuery} onChange={(event) => setDebtQuery(event.target.value)} placeholder="ابحث بالاسم أو الهاتف..." /></label><button className="action-button action-button--secondary debt-archive-toggle" onClick={() => setShowSettledDebts((current) => !current)}><Archive size={15} />{showSettledDebts ? `إظهار القائمة (${activeDebts.length})` : `الأرشيف (${settledDebts.length})`}</button><span className="status-badge">تحديث محلي فوري</span></div></div>{store.debts.length ? (showSettledDebts ? settledDebts : activeDebts).length ? <div className="debt-list">{(showSettledDebts ? settledDebts : activeDebts).map((debt) => { const remaining = Math.max(0, debt.amount - debt.paid); const settled = isSettledDebt(debt); return <div className={`debt-row ${settled ? "debt-row--settled" : ""}`} key={debt.id}><div className="debt-avatar">{debt.customerName.slice(0, 1)}</div><div className="debt-person"><strong>{debt.customerName}</strong><small>{debt.customerPhone ? `هاتف: ${debt.customerPhone} · ` : ""}{debt.note || `سجلت في ${formatDate(debt.createdAt)}`}{debt.dueDate ? ` · استحقاق ${debt.dueDate}` : ""}</small></div><div className="debt-amount"><span>المتبقي</span><b dir="ltr">{money(remaining)}</b><small>من {money(debt.amount)}</small></div><div className="debt-progress"><span><i style={{ width: `${Math.min(100, (debt.paid / debt.amount) * 100) || 0}%` }} /></span><small>تم تحصيل {money(debt.paid)}</small></div>{settled ? <span className="settled-label"><Check size={15} /> مسددة</span> : <div className="debt-row-actions"><button className="action-button action-button--secondary" onClick={() => collectDebt(debt)}>تسجيل دفعة</button>{debt.customerPhone && <button className="mini-icon mini-icon--whatsapp" onClick={() => openDebtReminder(debt)} aria-label="فتح تذكير واتساب يدوي"><MessageCircle size={16} /></button>}</div>}</div>})}</div> : <EmptyState icon={showSettledDebts ? Archive : Search} title={showSettledDebts ? "الأرشيف فارغ" : "لا توجد ذمم قائمة مطابقة"} description={showSettledDebts ? "ستظهر هنا الذمم بعد تحصيلها بالكامل." : "جرّب كتابة اسم الزبون أو رقم هاتفه دون مسافات إضافية."} /> : <EmptyState icon={WalletCards} title="دفتر الذمم فارغ" description="عند اختيار «آجل / ذمة» أثناء البيع، سيظهر سجل الزبون هنا تلقائيًا." action={<button className="text-button text-button--strong" onClick={() => setActivePage("sale")}>فتح شاشة البيع <ArrowLeft size={16} /></button>} />}</section>
            </section>
          )}

          {page === "reports" && (
            <section className="reports-page">
              <div className="page-intro"><div><span className="eyebrow"><BarChart3 size={15} /> أرقام واضحة</span><h2>اعرف كيف مضى <em>يوم محلك.</em></h2><p>تقارير مبنية من فواتيرك المحفوظة على هذا الجهاز، بلا إنترنت ولا تعقيد.</p></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> نسخة احتياطية</button><button className="action-button action-button--primary" onClick={() => void exportReportsExcel()}><FileText size={17} /> تقرير Excel</button></div></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">آخر 7 أيام</span><h3>ملخص الأرباح الأسبوعي</h3><p>{weeklySummary.invoices} فاتورة · مبيعات {money(weeklySummary.revenue)} · ربح {money(weeklySummary.profit)}</p></div><button className="action-button action-button--secondary" onClick={() => void exportWeeklyReportExcel()}><Download size={17} /> تقرير أسبوعي Excel</button></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">مقارنة أسبوعية</span><h3>{weekComparison.profitChange >= 0 ? "الأرباح ارتفعت" : "الأرباح انخفضت"} {money(Math.abs(weekComparison.profitChange))}</h3><p>هذا الأسبوع: مبيعات {money(weekComparison.current.revenue)} · ربح {money(weekComparison.current.profit)} · {weekComparison.current.invoices} فاتورة</p></div><div><span className="section-kicker">الأسبوع السابق</span><p>مبيعات {money(weekComparison.previous.revenue)} · ربح {money(weekComparison.previous.profit)} · {weekComparison.previous.invoices} فاتورة</p></div></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">هذا الشهر</span><h3>تقرير شهري مفصل</h3><p>{monthlySummary.invoices} فاتورة · {monthlySummary.units} وحدة · مبيعات {money(monthlySummary.revenue)} · ربح {money(monthlySummary.profit)}</p></div><div className="inventory-page__actions"><span className={`status-badge ${inactiveProducts.length ? "status-badge--warning" : ""}`}>{inactiveProducts.length ? `${inactiveProducts.length} أصناف بلا حركة` : "كل الأصناف لها حركة"}</span><button className="action-button action-button--secondary" onClick={() => void exportMonthlyReportExcel()}><Download size={17} /> تقرير شهري Excel</button></div></div>
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
                  </div>
                </section>
                <section className="panel settings-card settings-card--printer settings-card--printer-hub"><div className="setting-icon setting-icon--blue"><Printer size={21} /></div><div><span className="section-kicker">مركز الطباعة الحرارية</span><h3>اطبع عبر هاتف أندرويد</h3><p>لا يحتاج سوقنا إلى موديل محدد. ابدأ دائمًا باختيار الطابعة من نافذة أندرويد؛ فهذا يعرض الطابعات التي يعرفها هاتفك.</p></div><div className="printer-settings"><div className="printer-detect printer-detect--primary"><button onClick={printTestReceipt}><Printer size={15} /> اختيار طابعة من النظام</button><button onClick={() => void connectThermalPrinter()}><Bluetooth size={15} /> طابعة بلوتوث</button></div><details className="printer-usb-advanced"><summary><Search size={14} /> لدي كابل OTG وطابعة USB</summary><div><p>اضغط البحث فقط بعد وصل الطابعة بالهاتف عبر OTG. إن ظهرت أجهزة «مجهولة أو غير متوافقة»، ألغِ النافذة ولا تقرنها.</p><button onClick={() => void detectUsbThermalPrinter()}><Search size={14} /> بحث عن طابعة USB</button></div></details><span>مقاس الورق</span><div className="paper-presets"><button className={printerSettings.paperWidth === "58" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "58" }))}>58 مم</button><button className={printerSettings.paperWidth === "80" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "80" }))}>80 مم</button><button className={printerSettings.paperWidth === "A4" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "A4" }))}>A4</button></div><label className="printer-name"><span>اسم الطابعة</span><input value={printerSettings.deviceName} onChange={(event) => setPrinterSettings((current) => ({ ...current, deviceName: event.target.value }))} placeholder="اختياري — يُحفظ محليًا" /></label><label className="printer-name"><span>الطراز / رقم الملصق (اختياري)</span><input value={printerSettings.model} onChange={(event) => setPrinterSettings((current) => ({ ...current, model: event.target.value }))} placeholder="أي طابعة حرارية" /></label><label className="printer-name"><span>طريقة التوصيل</span><select value={printerSettings.connection} onChange={(event) => setPrinterSettings((current) => ({ ...current, connection: event.target.value as PrinterSettings["connection"] }))}><option value="system">اختيار من نافذة النظام</option><option value="usb">USB عبر وصلة OTG</option><option value="bluetooth">بلوتوث</option><option value="network">شبكة Wi‑Fi/LAN</option></select></label><p className="printer-help"><b>الخطوة الصحيحة أولًا:</b> اضغط «اختيار طابعة من النظام». إذا لم يظهر اسم الطابعة، افتح في أندرويد: <strong>الإعدادات ← الأجهزة المتصلة ← الطباعة</strong>، ثم فعّل خدمة طباعة متوافقة وأعد المحاولة. تحتاج طابعة USB إلى وصلة OTG أو اتصال شبكة قبل أن تصبح متاحة.</p></div></section>
                <section className="panel settings-card settings-card--install"><div className="setting-icon setting-icon--blue"><Download size={21} /></div><div><span className="section-kicker">تطبيق الهاتف</span><h3>ثبّت سوقنا على الشاشة</h3><p>افتحه من أيقونة مستقلة واستخدمه كمساعد يومي لمتجرك حتى عند انقطاع الإنترنت.</p></div><button className="action-button action-button--secondary" onClick={() => void installOnDevice()}><Download size={17} /> {installPrompt ? "تثبيت سوقنا الآن" : "إرشادات التثبيت"}</button></section>
                <section className="panel settings-card settings-card--readiness"><div className="setting-icon"><Check size={21} /></div><div><span className="section-kicker">جاهزية التشغيل</span><h3>حالة محلك على هذا الهاتف</h3><p>ملخص سريع للمكونات المحلية التي تحتاجها قبل بدء اليوم.</p></div><div className="readiness-list"><span><i /> التخزين المحلي: جاهز</span><span><i /> الطباعة: {printerSettings.deviceName || "اختيار الطابعة من النظام"}</span><span className={lastBackupAt ? "readiness-list__ok" : "readiness-list__attention"}><i /> النسخة الاحتياطية: {lastBackupAt ? `آخر تنزيل ${formatDate(lastBackupAt)}` : "صدّر نسخة أولى اليوم"}</span></div></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--apricot"><Download size={21} /></div><div><span className="section-kicker">نسخة احتياطية</span><h3>تصدير بياناتك</h3><p>نزّل ملفًا واحدًا يحتوي على المنتجات والفواتير والذمم، واحفظه في مكان آمن.</p></div><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> تصدير البيانات</button></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--sand"><Upload size={21} /></div><div><span className="section-kicker">استعادة</span><h3>استيراد نسخة</h3><p>يفحص سوقنا الملف ويعرض ملخصه قبل أن يستبدل بيانات هذا الجهاز.</p></div><input className="hidden-input" ref={fileInputRef} type="file" accept="application/json" onChange={(event) => { void importData(event.target.files?.[0]); event.currentTarget.value = ""; }} /><button className="action-button action-button--secondary" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> استيراد نسخة</button></section>
                <section className="panel settings-card settings-card--notifications"><div className="setting-icon setting-icon--blue"><BellRing size={21} /></div><div><span className="section-kicker">تنبيهات مخصصة</span><h3>مركز إشعارات المحل</h3><p>اختر التنبيهات التي تظهر لك في الجرس. تبقى اختياراتك على هذا الجهاز.</p></div><div className="notification-settings"><button className={notificationPreferences.stock ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, stock: !current.stock }))}><span><Archive size={15} /> انخفاض المخزون</span><i aria-label={notificationPreferences.stock ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.debts ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, debts: !current.debts }))}><span><WalletCards size={15} /> الذمم المستحقة</span><i aria-label={notificationPreferences.debts ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.backup ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, backup: !current.backup }))}><span><Download size={15} /> نسخة احتياطية يومية</span><i aria-label={notificationPreferences.backup ? "مفعل" : "متوقف"} /></button></div></section>
                <section className="panel settings-card settings-card--danger"><div className="setting-icon setting-icon--danger"><Trash2 size={21} /></div><div><span className="section-kicker">إعادة ضبط</span><h3>بدء محل جديد</h3><p>يحذف بيانات هذا المحل من الجهاز بالكامل ولا يضيف أي منتجات افتراضية. صدّر نسخة قبل المتابعة.</p></div><button className="action-button action-button--danger" onClick={resetData}><Trash2 size={17} /> حذف البيانات</button></section>
              </div>
              <section className="local-assurance" style={{ backgroundImage: `linear-gradient(90deg, rgba(31,76,60,.97), rgba(31,76,60,.88)), url(${receiptPatternUrl})` }}><img src={logoUrl} alt="" /><div><h3>محلك يستمر، حتى لو انقطع الإنترنت.</h3><p>سوقنا تطبيق محلي: الحسابات تعمل مباشرة على جهازك، ولا تحتاج إلى تسجيل دخول أو خادم لتتابع البيع.</p></div><span><WifiOff size={18} /> محلي بالكامل</span></section>
            </section>
          )}
        </div>
      </main>

      {showProductForm && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={saveProduct} role="dialog" aria-modal="true" aria-label={editingProduct ? "تعديل صنف" : "إضافة صنف"}><div className="modal-heading"><div><span className="section-kicker">المخزون</span><h3>{editingProduct ? "تعديل الصنف" : "إضافة صنف جديد"}</h3></div><button type="button" className="icon-button" onClick={() => { setShowProductForm(false); setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field field--wide"><span>اسم الصنف *</span><input name="name" autoFocus placeholder="مثال: زيت نباتي 1 لتر" defaultValue={editingProduct?.name} required /></label><label className="field"><span>رمز الصنف</span><input name="sku" placeholder="1006" defaultValue={editingProduct?.sku || pendingBarcode} /></label><label className="field"><span>التصنيف</span><input name="category" placeholder="مواد أساسية" defaultValue={editingProduct?.category || "عام"} /></label><label className="field"><span>الكمية الحالية *</span><input name="quantity" type="number" min="0" defaultValue={editingProduct?.quantity ?? "0"} required /></label><label className="field"><span>حد التنبيه *</span><input name="lowStockAt" type="number" min="0" defaultValue={editingProduct?.lowStockAt ?? "5"} required /></label><label className="field"><span>سعر الشراء (د.ل) *</span><input name="purchasePrice" type="number" step="0.01" min="0" defaultValue={editingProduct?.purchasePrice} required /></label><label className="field"><span>سعر البيع (د.ل) *</span><input name="salePrice" type="number" step="0.01" min="0" defaultValue={editingProduct?.salePrice} required /></label><div className="product-photo-field field field--wide"><span>صورة الصنف (اختيارية)</span><input className="hidden-input" ref={productImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(event) => { uploadProductImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /><div>{pendingProductImage ? <img src={pendingProductImage} alt="معاينة صورة الصنف" /> : <span><Camera size={20} /> لم تضف صورة بعد</span>}<button type="button" className="action-button action-button--secondary" onClick={() => productImageInputRef.current?.click()}><Camera size={16} /> كاميرا أو معرض</button>{pendingProductImage && <button type="button" className="text-button" onClick={() => setPendingProductImage("")}>إزالة الصورة</button>}</div><small>تُصغّر الصورة وتُحفظ محليًا على هذا الهاتف.</small></div></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setShowProductForm(false); setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit">{editingProduct ? <Pencil size={17} /> : <PackagePlus size={17} />}{editingProduct ? " حفظ التعديلات" : " حفظ الصنف"}</button></div></form></div>}
      {showDebtForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={addDebt} role="dialog" aria-modal="true" aria-label="إضافة ذمة"><div className="modal-heading"><div><span className="section-kicker">دفتر الذمم</span><h3>إضافة ذمة يدوية</h3></div><button type="button" className="icon-button" onClick={() => setShowDebtForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>اسم الزبون *</span><input name="customer" autoFocus placeholder="اسم الزبون" required /></label><label className="field"><span>هاتف الزبون (اختياري)</span><input name="customerPhone" inputMode="tel" placeholder="091 000 0000" /></label><label className="field"><span>المبلغ (د.ل) *</span><input name="amount" type="number" min="0.01" step="0.01" required /></label><label className="field"><span>تاريخ الاستحقاق</span><input name="dueDate" type="date" /></label><label className="field field--wide"><span>ملاحظة</span><input name="note" placeholder="مثال: بضاعة اليوم" /></label></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowDebtForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><WalletCards size={17} /> حفظ الذمة</button></div></form></div>}
      {collectionDebt && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitDebtCollection} role="dialog" aria-modal="true" aria-label="تحصيل ذمة"><div className="modal-heading"><div><span className="section-kicker">تحصيل ذمة</span><h3>{collectionDebt.customerName}</h3></div><button type="button" className="icon-button" onClick={() => { setCollectionDebt(null); setCollectionAmount(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>المتبقي حاليًا</span><strong dir="ltr">{money(Math.max(0, collectionDebt.amount - collectionDebt.paid))}</strong></div><label className="field"><span>المبلغ المقبوض (د.ل)</span><input autoFocus value={collectionAmount} onChange={(event) => setCollectionAmount(event.target.value)} type="number" min="0.01" step="0.01" inputMode="decimal" required /></label><p className="modal-note">عند إدخال المبلغ المتبقي كاملًا، تنتقل الذمة تلقائيًا إلى أرشيف الذمم المسددة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setCollectionDebt(null); setCollectionAmount(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ الدفعة</button></div></form></div>}
      {showShelfLabels && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="طباعة ملصقات أسعار"><div className="modal-heading"><div><span className="section-kicker">طباعة الرفوف</span><h3>اختر ملصقات الأسعار</h3></div><button type="button" className="icon-button" onClick={() => setShowShelfLabels(false)} aria-label="إغلاق"><X size={19} /></button></div><p className="modal-note">اطبع فقط الأصناف التي تحتاج ملصقات لها، ثم اختر أي طابعة ومقاس ورق من نافذة النظام.</p><div className="notification-settings">{filteredInventory.map((product) => { const checked = selectedLabelProductIds.includes(product.id); return <button key={product.id} className={checked ? "notification-setting--on" : ""} onClick={() => setSelectedLabelProductIds((current) => checked ? current.filter((id) => id !== product.id) : [...current, product.id])}><span><strong>{product.name}</strong><small dir="ltr">{money(product.salePrice)}</small></span><i aria-label={checked ? "مختار" : "غير مختار"} /></button>; })}</div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowShelfLabels(false)}>إلغاء</button><button type="button" className="action-button action-button--primary" onClick={printShelfLabels}><Printer size={17} /> طباعة المختار ({selectedLabelProductIds.length})</button></div></section></div>}
      {stocktakeProduct && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitStocktake} role="dialog" aria-modal="true" aria-label="جرد صنف بالكاميرا"><div className="modal-heading"><div><span className="section-kicker">جرد بالكاميرا</span><h3>{stocktakeProduct.name}</h3></div><button type="button" className="icon-button" onClick={() => { setStocktakeProduct(null); setStocktakeQuantity(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>الكمية المسجلة</span><strong>{stocktakeProduct.quantity} وحدة</strong></div><label className="field"><span>الكمية الفعلية بعد الجرد</span><input autoFocus value={stocktakeQuantity} onChange={(event) => setStocktakeQuantity(event.target.value)} type="number" min="0" step="1" inputMode="numeric" required /></label><p className="modal-note">قارن الكمية الفعلية بما في المخزون، ثم احفظ لتحديث رصيد الصنف محليًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setStocktakeProduct(null); setStocktakeQuantity(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد الجرد</button></div></form></div>}
      {showBarcodeScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowBarcodeScanner(false)} />}
      {showStocktakeScanner && <BarcodeScanner onDetected={handleStocktakeBarcodeDetected} onClose={() => setShowStocktakeScanner(false)} />}
      {showStoreSetup && <div className="modal-backdrop store-setup-backdrop" role="presentation"><form className="store-setup-card" onSubmit={finishStoreSetup} role="dialog" aria-modal="true" aria-label="إعداد محل جديد"><div className="store-setup-mark"><img src={logoUrl} alt="رمز سوقنا" /></div><span className="section-kicker">إعداد حقيقي لمحلّك</span><h2>لن نضيف أي أصناف<br/>بدلًا <em>عنك.</em></h2><p>ابدأ باسم محلك، ثم أضف أول صنف من مخزونك الفعلي. كل فاتورة وكمية وذمة تُحفظ محليًا على هذا الجهاز.</p><label className="field"><span>اسم المحل *</span><input name="storeName" autoFocus placeholder="مثال: بقالة الندى" required /></label><button className="action-button action-button--primary store-setup-submit" type="submit"><Store size={18} /> حفظ الاسم وإضافة أول صنف</button><small><WifiOff size={14} /> لا توجد بيانات تجريبية ولا يلزم اتصال بالإنترنت.</small></form></div>}
    </div>
  );
}
