export type QuickSalePaymentMethod = "cash" | "credit";

export type SuspendedCartItem = { productId: string; quantity: number };

export type SuspendedSaleDraft = {
  id: string;
  label: string;
  createdAt: string;
  items: SuspendedCartItem[];
  paymentMethod: QuickSalePaymentMethod;
  customerName: string;
  customerPhone: string;
  customerCategoryId: string;
  staffMemberId: string;
  discountPercent: number;
  note: string;
  orderReference: string;
};

export type QuickSaleProduct = { id: string; quantity: number };
export type QuickSaleFilterProduct = { name: string; sku: string; category?: string };

const clampText = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";

export const createSuspendedSaleDraft = (input: Omit<SuspendedSaleDraft, "items"> & { items: Array<{ id: string; cartQuantity: number }> }): SuspendedSaleDraft => ({
  ...input,
  label: clampText(input.label, 60) || "سلة معلقة",
  customerName: clampText(input.customerName, 80),
  customerPhone: clampText(input.customerPhone, 40),
  customerCategoryId: clampText(input.customerCategoryId, 80),
  staffMemberId: clampText(input.staffMemberId, 80),
  note: clampText(input.note, 240),
  orderReference: clampText(input.orderReference, 80),
  discountPercent: Math.min(100, Math.max(0, Number(input.discountPercent) || 0)),
  items: input.items.filter((item) => typeof item.id === "string" && item.id.trim() && Number.isFinite(item.cartQuantity) && item.cartQuantity > 0).map((item) => ({ productId: item.id, quantity: Math.max(1, Math.floor(item.cartQuantity)) })),
});

export const normaliseSuspendedSaleDrafts = (value: unknown): SuspendedSaleDraft[] => !Array.isArray(value) ? [] : value.flatMap((entry) => {
  if (!entry || typeof entry !== "object") return [];
  const candidate = entry as Partial<SuspendedSaleDraft>;
  if (typeof candidate.id !== "string" || !candidate.id.trim() || typeof candidate.createdAt !== "string" || !Array.isArray(candidate.items)) return [];
  const draft = createSuspendedSaleDraft({
    id: candidate.id.trim(), createdAt: candidate.createdAt, label: candidate.label || "", items: candidate.items.map((item) => ({ id: item.productId, cartQuantity: item.quantity })), paymentMethod: candidate.paymentMethod === "credit" ? "credit" : "cash", customerName: candidate.customerName || "", customerPhone: candidate.customerPhone || "", customerCategoryId: candidate.customerCategoryId || "", staffMemberId: candidate.staffMemberId || "", discountPercent: candidate.discountPercent || 0, note: candidate.note || "", orderReference: candidate.orderReference || "",
  });
  return draft.items.length ? [draft] : [];
});

export const restoreSuspendedCartItems = <Product extends QuickSaleProduct>(products: Product[], draft: SuspendedSaleDraft) => {
  let skipped = 0;
  const items = draft.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || product.quantity <= 0) { skipped += 1; return []; }
    return [{ ...product, cartQuantity: Math.min(product.quantity, item.quantity) }];
  });
  return { items, skipped };
};

export const normaliseFavoriteProductIds = (value: unknown, products: Array<{ id: string }>) => {
  const validIds = new Set(products.map((product) => product.id));
  return Array.isArray(value) ? Array.from(new Set(value.filter((id): id is string => typeof id === "string" && validIds.has(id)))) : [];
};

export const getQuickSaleCategories = (products: Array<{ category?: string }>) => Array.from(new Set(products.map((product) => product.category?.trim() || "غير مصنف"))).sort((left, right) => left.localeCompare(right, "ar"));

export const filterQuickSaleProducts = <Product extends QuickSaleFilterProduct>(products: Product[], query: string, category: string) => {
  const term = query.trim().toLocaleLowerCase("ar");
  return products.filter((product) => (!category || (product.category?.trim() || "غير مصنف") === category) && (!term || product.name.toLocaleLowerCase("ar").includes(term) || product.sku.toLocaleLowerCase("ar").includes(term)));
};
