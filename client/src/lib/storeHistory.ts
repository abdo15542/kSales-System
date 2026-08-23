export type PriceChangeField = "purchasePrice" | "salePrice";

export type ProductPriceSnapshot = {
  id: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
};

export type PriceChangeDraft = {
  field: PriceChangeField;
  previous: number;
  next: number;
};

export type SettledDebtSource = { amount: number; paid: number };

export const isSettledDebt = (debt: SettledDebtSource) => debt.paid >= debt.amount;

export const buildPriceChangeDrafts = (previous: ProductPriceSnapshot | null, next: ProductPriceSnapshot): PriceChangeDraft[] => {
  if (!previous) return [];
  const fields: PriceChangeField[] = ["purchasePrice", "salePrice"];
  return fields.flatMap((field) => previous[field] === next[field] ? [] : [{ field, previous: previous[field], next: next[field] }]);
};
