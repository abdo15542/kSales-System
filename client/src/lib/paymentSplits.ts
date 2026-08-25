import { getPaymentMethodLabel, type PaymentMethod } from "./paymentMethods";

export type PaymentSplit = { paymentMethod: PaymentMethod; amount: number; bankName?: string; posTerminalType?: string };

export const PAYMENT_SPLIT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "credit"];

export const getPaymentSplitsTotal = (splits: PaymentSplit[]) => splits.reduce((total, split) => total + Math.max(0, Number(split.amount) || 0), 0);

export const normalizePaymentSplits = (splits: PaymentSplit[], total: number): PaymentSplit[] => splits.filter((split) => PAYMENT_SPLIT_METHODS.includes(split.paymentMethod) && Number.isFinite(split.amount) && split.amount > 0).map((split) => ({ paymentMethod: split.paymentMethod, amount: Math.round(split.amount * 100) / 100, bankName: split.paymentMethod === "card" || split.paymentMethod === "transfer" ? split.bankName?.trim().slice(0, 80) || undefined : undefined, posTerminalType: split.paymentMethod === "card" || split.paymentMethod === "transfer" ? split.posTerminalType?.trim().slice(0, 80) || undefined : undefined })).filter((split) => split.amount <= total);

export const getPaymentSplitsLabel = (splits: PaymentSplit[]) => splits.map((split) => `${getPaymentMethodLabel(split.paymentMethod)}: ${split.amount.toFixed(2)} د.ل`).join(" · ");
