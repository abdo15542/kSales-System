type BackupRecord = Record<string, unknown>;

export type BackupValidation =
  | { valid: true; summary: { products: number; sales: number; debts: number; storeName: string } }
  | { valid: false; reason: string };

const isRecord = (value: unknown): value is BackupRecord => typeof value === "object" && value !== null && !Array.isArray(value);

export const validateStoreBackup = (value: unknown): BackupValidation => {
  if (!isRecord(value)) return { valid: false, reason: "الملف ليس نسخة بيانات صالحة." };
  const { products, sales, debts, storeName } = value;
  if (!Array.isArray(products) || !Array.isArray(sales) || !Array.isArray(debts)) {
    return { valid: false, reason: "لا يحتوي الملف على أقسام المنتجات والفواتير والذمم." };
  }
  if (products.some((product) => !isRecord(product) || typeof product.name !== "string" || !product.name.trim())) {
    return { valid: false, reason: "يوجد صنف غير صالح داخل النسخة الاحتياطية." };
  }
  if (sales.some((sale) => !isRecord(sale) || !Array.isArray(sale.items))) {
    return { valid: false, reason: "يوجد سجل فاتورة غير صالح داخل النسخة الاحتياطية." };
  }
  if (debts.some((debt) => !isRecord(debt) || typeof debt.customerName !== "string")) {
    return { valid: false, reason: "يوجد سجل ذمة غير صالح داخل النسخة الاحتياطية." };
  }
  return {
    valid: true,
    summary: {
      products: products.length,
      sales: sales.length,
      debts: debts.length,
      storeName: typeof storeName === "string" && storeName.trim() ? storeName : "محل مستورد",
    },
  };
};
