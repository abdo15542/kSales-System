/**
 * فلسفة «دفتر الحي المعاصر»: واجهة عربية دافئة تشبه دفتر تشغيل منظم؛
 * مساحات ورقية، أخضر زيتوني، وأفعال تشغيل كبيرة وواضحة لصاحب المحل.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  BellRing,
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
  Minus,
  PackagePlus,
  Plus,
  Printer,
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

type Page = "dashboard" | "sale" | "inventory" | "debts" | "reports" | "settings";
type PaymentMethod = "cash" | "credit";

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
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
  paymentMethod: PaymentMethod;
  customerName?: string;
};

type Debt = {
  id: string;
  customerName: string;
  amount: number;
  paid: number;
  createdAt: string;
  dueDate: string;
  note: string;
};

type StoreData = {
  products: Product[];
  sales: Sale[];
  debts: Debt[];
  storeName: string;
};

const STORAGE_KEY = "souqna-local-store-v1";
const logoUrl = "/manus-storage/souqna-logo_8eb5e872.png";
const ledgerTextureUrl = "/manus-storage/souqna-ledger-texture_5ff659ed.jpg";
const counterImageUrl = "/manus-storage/souqna-store-counter_0b8a8486.jpg";
const receiptPatternUrl = "/manus-storage/souqna-receipt-pattern_1ca66f66.jpg";

const starterProducts: Product[] = [
  { id: "water", name: "مياه معدنية 1.5 لتر", sku: "1001", category: "مشروبات", quantity: 24, lowStockAt: 6, purchasePrice: 0.8, salePrice: 1.3 },
  { id: "milk", name: "حليب طويل الأجل", sku: "1002", category: "ألبان", quantity: 12, lowStockAt: 5, purchasePrice: 2.1, salePrice: 2.8 },
  { id: "juice", name: "عصير برتقال", sku: "1003", category: "مشروبات", quantity: 7, lowStockAt: 8, purchasePrice: 1.5, salePrice: 2.2 },
  { id: "biscuits", name: "بسكويت شاي", sku: "1004", category: "معلبات", quantity: 18, lowStockAt: 4, purchasePrice: 0.9, salePrice: 1.5 },
  { id: "rice", name: "أرز أبيض 1 كغ", sku: "1005", category: "مواد أساسية", quantity: 4, lowStockAt: 6, purchasePrice: 4.8, salePrice: 6.4 },
];

const defaultStoreData: StoreData = {
  products: starterProducts,
  sales: [],
  debts: [],
  storeName: "بقالة الحي",
};

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

function readStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoreData;
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      products: parsed.products?.length ? parsed.products : starterProducts,
      sales: parsed.sales ?? [],
      debts: parsed.debts ?? [],
      storeName: parsed.storeName || defaultStoreData.storeName,
    };
  } catch {
    return defaultStoreData;
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
  const [store, setStore] = useState<StoreData>(readStore);
  const [page, setPage] = useState<Page>("dashboard");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [latestSale, setLatestSale] = useState<Sale | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

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
  const salesTodayTotal = useMemo(() => todaySales.reduce((total, sale) => total + sale.total, 0), [todaySales]);
  const profitToday = useMemo(() => todaySales.reduce((total, sale) => total + sale.profit, 0), [todaySales]);
  const totalOutstanding = useMemo(() => store.debts.reduce((total, debt) => total + Math.max(0, debt.amount - debt.paid), 0), [store.debts]);
  const lowStock = useMemo(() => store.products.filter((product) => product.quantity <= product.lowStockAt), [store.products]);
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.salePrice * item.cartQuantity, 0), [cart]);
  const cartProfit = useMemo(() => cart.reduce((total, item) => total + (item.salePrice - item.purchasePrice) * item.cartQuantity, 0), [cart]);
  const filteredSaleProducts = useMemo(() => store.products.filter((product) => product.quantity > 0 && product.name.includes(query.trim())), [store.products, query]);
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

  const printReceipt = (sale: Sale) => {
    const receiptWindow = window.open("", "_blank", "width=390,height=650");
    if (!receiptWindow) {
      toast.error("تعذّر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.");
      return;
    }
    const rows = sale.items.map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${money(item.price * item.quantity)}</td></tr>`).join("");
    receiptWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${sale.id.slice(-5)}</title><style>body{font-family:Arial,sans-serif;width:72mm;margin:0 auto;color:#173c31;padding:12px;font-size:12px}h1{font-size:21px;margin:0 0 5px;text-align:center}p{text-align:center;color:#617066;margin:3px 0 14px}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px dashed #bfc9bf}td:nth-child(2),td:nth-child(3){text-align:left;white-space:nowrap}.total{font-size:17px;font-weight:bold;border-top:2px solid #173c31;margin-top:10px;padding-top:10px;display:flex;justify-content:space-between}.foot{font-size:10px;margin-top:16px}.tag{display:inline-block;background:#edf2e8;padding:3px 7px;border-radius:999px;font-size:10px}</style></head><body><h1>${store.storeName}</h1><p>فاتورة رقم ${sale.id.slice(-5)} · ${formatDate(sale.createdAt)}</p><table><thead><tr><td>الصنف</td><td>الكمية</td><td>الإجمالي</td></tr></thead><tbody>${rows}</tbody></table><div class="total"><span>الإجمالي</span><span>${money(sale.total)}</span></div><p class="foot"><span class="tag">${sale.paymentMethod === "cash" ? "نقدًا" : "آجل"}</span><br/>شكرًا لتسوقكم معنا</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    receiptWindow.document.close();
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
      paymentMethod,
      customerName: paymentMethod === "credit" ? customerName.trim() : undefined,
    };
    setStore((current) => ({
      ...current,
      sales: [sale, ...current.sales],
      products: current.products.map((product) => {
        const item = cart.find((candidate) => candidate.id === product.id);
        return item ? { ...product, quantity: product.quantity - item.cartQuantity } : product;
      }),
      debts: paymentMethod === "credit" ? [{ id: makeId("debt"), customerName: customerName.trim(), amount: cartTotal, paid: 0, createdAt: sale.createdAt, dueDate: "", note: `فاتورة رقم ${sale.id.slice(-5)}` }, ...current.debts] : current.debts,
    }));
    setLatestSale(sale);
    setCart([]);
    setCustomerName("");
    setPaymentMethod("cash");
    toast.success(paymentMethod === "credit" ? "تم حفظ البيع والذمة." : "تم تسجيل البيع بنجاح.");
  };

  const addProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const product: Product = {
      id: makeId("product"),
      name: String(data.get("name") || "").trim(),
      sku: String(data.get("sku") || "").trim() || `S-${Date.now().toString().slice(-4)}`,
      category: String(data.get("category") || "عام").trim(),
      quantity: Number(data.get("quantity")),
      lowStockAt: Number(data.get("lowStockAt")),
      purchasePrice: Number(data.get("purchasePrice")),
      salePrice: Number(data.get("salePrice")),
    };
    if (!product.name || [product.quantity, product.lowStockAt, product.purchasePrice, product.salePrice].some(Number.isNaN)) {
      toast.error("أكمل بيانات الصنف المطلوبة.");
      return;
    }
    setStore((current) => ({ ...current, products: [product, ...current.products] }));
    setShowProductForm(false);
    toast.success("تمت إضافة الصنف إلى المخزون.");
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
    setStore((current) => ({ ...current, debts: [{ id: makeId("debt"), customerName: customer, amount, paid: 0, createdAt: new Date().toISOString(), dueDate: String(data.get("dueDate") || ""), note: String(data.get("note") || "") }, ...current.debts] }));
    setShowDebtForm(false);
    toast.success("تمت إضافة الذمة إلى الدفتر.");
  };

  const collectDebt = (debt: Debt) => {
    const outstanding = Math.max(0, debt.amount - debt.paid);
    const response = window.prompt(`المبلغ المتبقي لـ ${debt.customerName}: ${money(outstanding)}\nأدخل المبلغ المقبوض:`);
    const value = Number(response);
    if (!response) return;
    if (!value || value <= 0) {
      toast.error("أدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }
    setStore((current) => ({ ...current, debts: current.debts.map((item) => item.id === debt.id ? { ...item, paid: Math.min(item.amount, item.paid + value) } : item) }));
    toast.success("تم تسجيل الدفعة.");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `souqna-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل نسخة احتياطية من بياناتك.");
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as StoreData;
      if (!Array.isArray(parsed.products) || !Array.isArray(parsed.sales) || !Array.isArray(parsed.debts)) throw new Error("صيغة غير صالحة");
      setStore({ products: parsed.products, sales: parsed.sales, debts: parsed.debts, storeName: parsed.storeName || defaultStoreData.storeName });
      setCart([]);
      toast.success("تم استيراد النسخة الاحتياطية بنجاح.");
    } catch {
      toast.error("تعذّر قراءة الملف. اختر نسخة احتياطية من سوقنا.");
    }
  };

  const resetData = () => {
    if (!window.confirm("سيتم حذف المبيعات والذمم الحالية وإعادة المنتجات الأساسية. هل تريد المتابعة؟")) return;
    setStore(defaultStoreData);
    setCart([]);
    toast.success("أُعيدت بيانات التطبيق إلى حالة البداية.");
  };

  const pageTitle: Record<Page, string> = { dashboard: "لوحة اليوم", sale: "بيع جديد", inventory: "إدارة المخزون", debts: "دفتر الذمم", reports: "تقارير المتجر", settings: "الإعدادات" };

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
            <div className="topbar-ledger-mark" aria-hidden="true"><img src={logoUrl} alt="" /><span>دفتر<br/>التشغيل</span></div>
            <div><p>مرحبًا بك في {store.storeName}</p><h1>{pageTitle[page]}</h1></div>
          </div>
          <div className="topbar__tools">
            <span className={`connection-pill ${isOnline ? "" : "connection-pill--offline"}`}>{isOnline ? <Check size={14} /> : <WifiOff size={14} />}{isOnline ? "جاهز للعمل دون إنترنت" : "وضع العمل المحلي"}</span>
            <button className="action-button action-button--primary action-button--new-sale" onClick={() => setActivePage("sale")}><Plus size={19} /> بيعة جديدة</button>
          </div>
        </header>

        <div className="page-content">
          {page === "dashboard" && (
            <section className="dashboard-page">
              <div className="ledger-ribbon" aria-label="مؤشر دفتر التشغيل اليومي">
                <div className="ledger-ribbon__stamp"><img src={logoUrl} alt="" /><span><b>دفتر اليوم</b><small>تشغيل محلك خطوة بخطوة</small></span></div>
                <div className="ledger-ribbon__date"><CalendarDays size={16} /><span>سجل اليوم</span><b>{new Intl.DateTimeFormat("ar-LY", { day: "2-digit", month: "short" }).format(new Date())}</b></div>
                <div className="ledger-ribbon__status"><i /><span>المحل مفتوح</span><small>المبيعات محفوظة محليًا</small></div>
              </div>
              <div className="dashboard-greeting" style={{ backgroundImage: `linear-gradient(90deg, rgba(247,241,229,.96) 34%, rgba(247,241,229,.52) 70%, rgba(247,241,229,.09)), url(${ledgerTextureUrl})` }}>
                <div className="greeting-copy">
                  <span className="eyebrow"><CalendarDays size={15} /> {new Intl.DateTimeFormat("ar-LY", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
                  <h2>يوم منظم يبدأ من <em>محلك.</em></h2>
                  <p>تابع مبيعاتك ومخزونك وذممك من شاشة واحدة، حتى عندما ينقطع الإنترنت.</p>
                  <button className="action-button action-button--primary" onClick={() => setActivePage("sale")}><ShoppingBag size={18} /> تسجيل بيع</button>
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
                      {todaySales.slice(0, 5).map((sale) => <div className="activity-row" key={sale.id}><span className="activity-icon"><ReceiptText size={18} /></span><div><strong>فاتورة #{sale.id.slice(-5)}</strong><small>{formatDate(sale.createdAt)} · {sale.items.length} أصناف</small></div><b dir="ltr">{money(sale.total)}</b><button className="mini-icon" onClick={() => printReceipt(sale)} aria-label="طباعة الفاتورة"><Printer size={16} /></button></div>)}
                    </div>
                  ) : <EmptyState icon={ReceiptText} title="لا توجد مبيعات مسجلة اليوم" description="ابدأ أول بيعة، وسيتولى سوقنا حساب الإجمالي والربح." action={<button className="text-button text-button--strong" onClick={() => setActivePage("sale")}>فتح شاشة البيع <ArrowLeft size={16} /></button>} />}
                </section>

                <section className="panel panel--low-stock">
                  <div className="panel-heading"><div><span className="section-kicker">المخزون</span><h3>محتاج متابعة</h3></div><button className="text-button" onClick={() => setActivePage("inventory")}>عرض المخزون <ChevronLeft size={16} /></button></div>
                  {lowStock.length ? <div className="stock-alerts">{lowStock.map((product) => <div className="stock-alert" key={product.id}><div><strong>{product.name}</strong><small>الحد الأدنى: {product.lowStockAt} وحدات</small></div><b>{product.quantity}</b><span>وحدات</span></div>)}</div> : <EmptyState icon={Check} title="كل الأصناف مطمئنة" description="لا توجد أصناف تجاوزت حد إعادة الطلب." />}
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
                  <div className="panel-heading panel-heading--stack"><div><span className="section-kicker">الأصناف المتاحة</span><h3>اختيار سريع</h3></div><button onClick={() => setShowProductForm(true)} className="text-button text-button--strong"><PackagePlus size={16} /> إضافة صنف</button></div>
                  <label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الصنف..." /></label>
                  <div className="product-grid">
                    {filteredSaleProducts.map((product) => <button className="product-tile" key={product.id} onClick={() => addToCart(product)}><span className="product-tile__category">{product.category}</span><strong>{product.name}</strong><div><b dir="ltr">{money(product.salePrice)}</b><small>{product.quantity} متوفر</small></div><span className={`stock-dot ${product.quantity <= product.lowStockAt ? "stock-dot--low" : ""}`} /></button>)}
                  </div>
                  {!filteredSaleProducts.length && <EmptyState icon={Box} title="لا توجد أصناف مطابقة" description="جرّب بحثًا مختلفًا أو أضف صنفًا جديدًا." />}
                </section>

                <aside className="cart-panel">
                  <div className="cart-panel__head"><div><span className="section-kicker">الفاتورة الحالية</span><h3>سلة البيع</h3></div><span className="cart-count">{cart.reduce((count, item) => count + item.cartQuantity, 0)}</span></div>
                  <div className="cart-items">
                    {cart.length ? cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item__info"><strong>{item.name}</strong><small dir="ltr">{money(item.salePrice)} للوحدة</small></div><div className="quantity-controls"><button onClick={() => changeCartQuantity(item.id, -1)} aria-label="تقليل الكمية"><Minus size={15} /></button><b>{item.cartQuantity}</b><button onClick={() => changeCartQuantity(item.id, 1)} aria-label="زيادة الكمية"><Plus size={15} /></button></div><b className="cart-item__total" dir="ltr">{money(item.salePrice * item.cartQuantity)}</b><button className="mini-icon mini-icon--danger" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))} aria-label="إزالة الصنف"><Trash2 size={15} /></button></div>) : <EmptyState icon={ShoppingBag} title="السلة فارغة" description="اختر الأصناف من القائمة لإضافتها إلى هذه الفاتورة." />}
                  </div>
                  <div className="payment-method"><p>طريقة الدفع</p><div><button className={paymentMethod === "cash" ? "selected" : ""} onClick={() => setPaymentMethod("cash")}><CircleDollarSign size={17} /> نقدًا</button><button className={paymentMethod === "credit" ? "selected" : ""} onClick={() => setPaymentMethod("credit")}><UserRound size={17} /> آجل / ذمة</button></div>{paymentMethod === "credit" && <label className="customer-field"><UserRound size={16} /><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="اسم الزبون" /></label>}</div>
                  <div className="cart-total"><div><span>الإجمالي</span><small>ربح متوقع: {money(cartProfit)}</small></div><strong dir="ltr">{money(cartTotal)}</strong></div>
                  <button className="action-button action-button--checkout" disabled={!cart.length} onClick={completeSale}><Check size={19} /> تأكيد البيع</button>
                  <p className="cart-footnote"><Printer size={14} /> بعد التأكيد يمكنك طباعة الفاتورة عبر طابعتك المرتبطة بالبلوتوث.</p>
                </aside>
              </div>
              {latestSale && <div className="sale-success"><span><Check size={18} /></span><p>تم حفظ فاتورة بقيمة <b dir="ltr">{money(latestSale.total)}</b></p><button onClick={() => printReceipt(latestSale)}><Printer size={16} /> طباعة الفاتورة</button><button className="sale-success__dismiss" onClick={() => setLatestSale(null)} aria-label="إخفاء"><X size={17} /></button></div>}
            </section>
          )}

          {page === "inventory" && (
            <section className="inventory-page">
              <div className="page-intro"><div><span className="eyebrow"><Archive size={15} /> إدارة المنتجات</span><h2>مخزونك، واضح <em>دائمًا.</em></h2><p>أضف أصنافك وحدد حد التنبيه لكل صنف؛ سيتابع سوقنا الكميات بعد كل بيع.</p></div><button className="action-button action-button--primary" onClick={() => setShowProductForm(true)}><PackagePlus size={18} /> إضافة صنف</button></div>
              <div className="inventory-summary"><div><span>إجمالي الأصناف</span><b>{store.products.length}</b></div><div><span>وحدات بالمخزون</span><b>{store.products.reduce((total, product) => total + product.quantity, 0)}</b></div><div><span>قيمة المخزون (شراء)</span><b dir="ltr">{money(store.products.reduce((total, product) => total + product.quantity * product.purchasePrice, 0))}</b></div><div className={lowStock.length ? "warning" : "safe"}><span>تحتاج إعادة طلب</span><b>{lowStock.length}</b></div></div>
              <section className="panel inventory-table-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">قائمة الأصناف</span><h3>المخزون الحالي</h3></div><label className="search-box search-box--small"><Search size={17} /><input value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} placeholder="ابحث باسم أو رمز..." /></label></div>
                <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>الرمز</th><th>المتوفر</th><th>سعر الشراء</th><th>سعر البيع</th><th>الحالة</th><th></th></tr></thead><tbody>{filteredInventory.map((product) => { const low = product.quantity <= product.lowStockAt; return <tr key={product.id}><td><div className="product-cell"><span>{product.name.slice(0, 1)}</span><div><strong>{product.name}</strong><small>{product.category}</small></div></div></td><td dir="ltr">{product.sku}</td><td><b className={low ? "low-number" : ""}>{product.quantity}</b><small> / حد {product.lowStockAt}</small></td><td dir="ltr">{money(product.purchasePrice)}</td><td dir="ltr">{money(product.salePrice)}</td><td><span className={`status-badge ${low ? "status-badge--warning" : ""}`}>{low ? "منخفض" : "متوفر"}</span></td><td><button className="mini-icon" onClick={() => { const added = Number(window.prompt(`إضافة كمية إلى ${product.name}:`, "1")); if (added > 0) { setStore((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + added } : item) })); toast.success("تم تحديث الكمية."); } }} aria-label="إضافة كمية"><Plus size={16} /></button></td></tr>})}</tbody></table></div>
                {!filteredInventory.length && <EmptyState icon={Archive} title="المخزون فارغ" description="أضف أول صنف لتبدأ متابعة منتجات محلك." />}
              </section>
            </section>
          )}

          {page === "debts" && (
            <section className="debts-page">
              <div className="page-intro"><div><span className="eyebrow"><WalletCards size={15} /> متابعة الزبائن</span><h2>دفتر الذمم، <em>من دون ورق.</em></h2><p>كل عملية آجلة تسجل تلقائيًا. أضف ذمة يدوية أو سجل دفعة عندما يسدد الزبون.</p></div><button className="action-button action-button--primary" onClick={() => setShowDebtForm(true)}><Plus size={18} /> إضافة ذمة</button></div>
              <div className="debt-overview"><div className="debt-overview__total"><span>إجمالي المبلغ المستحق</span><strong dir="ltr">{money(totalOutstanding)}</strong><small>لدى {store.debts.filter((debt) => debt.amount > debt.paid).length} زبون</small></div><div className="debt-overview__hint"><CircleAlert size={22} /><p>حافظ على التواصل: الذمة الواضحة تحمي علاقتك بالزبون وتساعدك على التخطيط للشراء.</p></div></div>
              <section className="panel debt-list-panel"><div className="panel-heading"><div><span className="section-kicker">سجل الذمم</span><h3>المبالغ القائمة</h3></div><span className="status-badge">تحديث محلي فوري</span></div>{store.debts.length ? <div className="debt-list">{store.debts.map((debt) => { const remaining = Math.max(0, debt.amount - debt.paid); const settled = remaining === 0; return <div className={`debt-row ${settled ? "debt-row--settled" : ""}`} key={debt.id}><div className="debt-avatar">{debt.customerName.slice(0, 1)}</div><div className="debt-person"><strong>{debt.customerName}</strong><small>{debt.note || `سجلت في ${formatDate(debt.createdAt)}`}{debt.dueDate ? ` · استحقاق ${debt.dueDate}` : ""}</small></div><div className="debt-amount"><span>المتبقي</span><b dir="ltr">{money(remaining)}</b><small>من {money(debt.amount)}</small></div><div className="debt-progress"><span><i style={{ width: `${Math.min(100, (debt.paid / debt.amount) * 100) || 0}%` }} /></span><small>تم تحصيل {money(debt.paid)}</small></div>{settled ? <span className="settled-label"><Check size={15} /> مسددة</span> : <button className="action-button action-button--secondary" onClick={() => collectDebt(debt)}>تسجيل دفعة</button>}</div>})}</div> : <EmptyState icon={WalletCards} title="دفتر الذمم فارغ" description="عند اختيار «آجل / ذمة» أثناء البيع، سيظهر سجل الزبون هنا تلقائيًا." action={<button className="text-button text-button--strong" onClick={() => setActivePage("sale")}>فتح شاشة البيع <ArrowLeft size={16} /></button>} />}</section>
            </section>
          )}

          {page === "reports" && (
            <section className="reports-page">
              <div className="page-intro"><div><span className="eyebrow"><BarChart3 size={15} /> أرقام واضحة</span><h2>اعرف كيف مضى <em>يوم محلك.</em></h2><p>تقارير مبنية من فواتيرك المحفوظة على هذا الجهاز، بلا إنترنت ولا تعقيد.</p></div><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> تنزيل نسخة</button></div>
              <div className="report-stats"><StatCard label="مبيعات هذا الشهر" value={money(monthSales.reduce((total, sale) => total + sale.total, 0))} detail={`${monthSales.length} فاتورة`} icon={CircleDollarSign} tone="olive" /><StatCard label="أرباح هذا الشهر" value={money(monthSales.reduce((total, sale) => total + sale.profit, 0))} detail="فرق البيع عن الشراء" icon={TrendingUp} tone="blue" /><StatCard label="متوسط الفاتورة" value={money(monthSales.length ? monthSales.reduce((total, sale) => total + sale.total, 0) / monthSales.length : 0)} detail="لكل بيع مسجل" icon={ReceiptText} tone="sand" /></div>
              <div className="report-columns"><section className="panel report-chart"><div className="panel-heading"><div><span className="section-kicker">هذا الشهر</span><h3>الأصناف الأكثر مبيعًا</h3></div><span className="chart-note">حسب الوحدات</span></div>{itemSales.length ? <div className="bars">{itemSales.slice(0, 6).map((item, index) => <div className="bar-row" key={item.name}><div><span>{index + 1}</span><strong>{item.name}</strong></div><div className="bar-track"><i style={{ width: `${(item.quantity / itemSales[0].quantity) * 100}%` }} /></div><b>{item.quantity}</b></div>)}</div> : <EmptyState icon={BarChart3} title="التقرير ينتظر أول عملية بيع" description="سجّل فواتيرك وستظهر المنتجات الأعلى مبيعًا هنا." />}</section><section className="panel report-totals"><div className="panel-heading"><div><span className="section-kicker">ملخص النشاط</span><h3>نظرة مالية</h3></div></div><div className="financial-stack"><div><span>إيرادات الشهر</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + sale.total, 0))}</b></div><div><span>تكلفة البضاعة المباعة</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + (sale.total - sale.profit), 0))}</b></div><div className="financial-stack__profit"><span>الربح الإجمالي</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + sale.profit, 0))}</b></div></div><div className="report-advice"><TrendingUp size={18} /><p>{monthSales.length ? "استمر في تسجيل كل فاتورة؛ دقة التقرير تتحسن مع انتظام الإدخال." : "ستظهر هنا مقارنة شهرية تلقائية بمجرد بدء البيع."}</p></div></section></div>
            </section>
          )}

          {page === "settings" && (
            <section className="settings-page">
              <div className="page-intro"><div><span className="eyebrow"><Settings size={15} /> تحكم محلي</span><h2>إعدادات بسيطة، <em>بياناتك بيدك.</em></h2><p>يُحفظ كل ما تسجله داخل متصفح هذا الجهاز. احتفظ بنسخة احتياطية دورية.</p></div></div>
              <div className="settings-grid">
                <section className="panel settings-card"><div className="setting-icon"><Store size={21} /></div><div><span className="section-kicker">بيانات المحل</span><h3>اسم المتجر</h3><p>يظهر في رأس التطبيق وعلى الفاتورة المطبوعة.</p></div><label className="setting-input"><input value={store.storeName} onChange={(event) => setStore((current) => ({ ...current, storeName: event.target.value }))} placeholder="اسم محلك" /><Check size={17} /></label></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--blue"><Printer size={21} /></div><div><span className="section-kicker">الفواتير</span><h3>الطباعة والبلوتوث</h3><p>اربط طابعتك الصغيرة من إعدادات الهاتف أو النظام، ثم استخدم زر «طباعة» بعد البيع. تعمل نافذة الطباعة دون إنترنت.</p></div><button className="action-button action-button--secondary" onClick={() => { if ("bluetooth" in navigator) toast.info("اختيار طابعة البلوتوث يتم من نافذة طباعة النظام بعد إقرانها."); else toast.info("اربط الطابعة من إعدادات النظام، ثم اخترها من نافذة الطباعة."); }}><Bluetooth size={17} /> إرشادات الطابعة</button></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--apricot"><Download size={21} /></div><div><span className="section-kicker">نسخة احتياطية</span><h3>تصدير بياناتك</h3><p>نزّل ملفًا واحدًا يحتوي على المنتجات والفواتير والذمم، واحفظه في مكان آمن.</p></div><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> تصدير البيانات</button></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--sand"><Upload size={21} /></div><div><span className="section-kicker">استعادة</span><h3>استيراد نسخة</h3><p>استبدل بيانات هذا الجهاز بنسخة احتياطية محفوظة سابقًا من سوقنا.</p></div><input className="hidden-input" ref={fileInputRef} type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} /><button className="action-button action-button--secondary" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> استيراد نسخة</button></section>
                <section className="panel settings-card settings-card--danger"><div className="setting-icon setting-icon--danger"><Trash2 size={21} /></div><div><span className="section-kicker">إعادة ضبط</span><h3>بدء جديد</h3><p>يحذف المبيعات والذمم ويعيد قائمة المنتجات الأساسية. صدّر نسخة قبل إعادة الضبط إن احتجتها.</p></div><button className="action-button action-button--danger" onClick={resetData}><Trash2 size={17} /> إعادة الضبط</button></section>
              </div>
              <section className="local-assurance" style={{ backgroundImage: `linear-gradient(90deg, rgba(31,76,60,.97), rgba(31,76,60,.88)), url(${receiptPatternUrl})` }}><img src={logoUrl} alt="" /><div><h3>محلك يستمر، حتى لو انقطع الإنترنت.</h3><p>سوقنا تطبيق محلي: الحسابات تعمل مباشرة على جهازك، ولا تحتاج إلى تسجيل دخول أو خادم لتتابع البيع.</p></div><span><WifiOff size={18} /> محلي بالكامل</span></section>
            </section>
          )}
        </div>
      </main>

      {showProductForm && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={addProduct} role="dialog" aria-modal="true" aria-label="إضافة صنف"><div className="modal-heading"><div><span className="section-kicker">المخزون</span><h3>إضافة صنف جديد</h3></div><button type="button" className="icon-button" onClick={() => setShowProductForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field field--wide"><span>اسم الصنف *</span><input name="name" autoFocus placeholder="مثال: زيت نباتي 1 لتر" required /></label><label className="field"><span>رمز الصنف</span><input name="sku" placeholder="1006" /></label><label className="field"><span>التصنيف</span><input name="category" placeholder="مواد أساسية" defaultValue="عام" /></label><label className="field"><span>الكمية الحالية *</span><input name="quantity" type="number" min="0" defaultValue="0" required /></label><label className="field"><span>حد التنبيه *</span><input name="lowStockAt" type="number" min="0" defaultValue="5" required /></label><label className="field"><span>سعر الشراء (د.ل) *</span><input name="purchasePrice" type="number" step="0.01" min="0" required /></label><label className="field"><span>سعر البيع (د.ل) *</span><input name="salePrice" type="number" step="0.01" min="0" required /></label></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowProductForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><PackagePlus size={17} /> حفظ الصنف</button></div></form></div>}
      {showDebtForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={addDebt} role="dialog" aria-modal="true" aria-label="إضافة ذمة"><div className="modal-heading"><div><span className="section-kicker">دفتر الذمم</span><h3>إضافة ذمة يدوية</h3></div><button type="button" className="icon-button" onClick={() => setShowDebtForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>اسم الزبون *</span><input name="customer" autoFocus placeholder="اسم الزبون" required /></label><label className="field"><span>المبلغ (د.ل) *</span><input name="amount" type="number" min="0.01" step="0.01" required /></label><label className="field"><span>تاريخ الاستحقاق</span><input name="dueDate" type="date" /></label><label className="field"><span>ملاحظة</span><input name="note" placeholder="مثال: بضاعة اليوم" /></label></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowDebtForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><WalletCards size={17} /> حفظ الذمة</button></div></form></div>}
    </div>
  );
}
