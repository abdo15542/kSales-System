export type ReservationEntry = { productId: string; quantity: number };
export type ContainerLedgerEntry = { customerName: string; containerName: string; quantity: number; direction: "out" | "in" };

export const getReservedQuantity = (reservations: ReservationEntry[], productId: string) => reservations.filter((entry) => entry.productId === productId).reduce((total, entry) => total + Math.max(0, entry.quantity), 0);

export const getReservableQuantity = (stockQuantity: number, reservations: ReservationEntry[], productId: string) => Math.max(0, stockQuantity - getReservedQuantity(reservations, productId));

export const getContainerBalances = (entries: ContainerLedgerEntry[]) => {
  const balances = new Map<string, { customerName: string; containerName: string; quantity: number }>();
  entries.forEach((entry) => {
    const key = `${entry.customerName.trim().toLocaleLowerCase("ar")}::${entry.containerName.trim().toLocaleLowerCase("ar")}`;
    const current = balances.get(key) ?? { customerName: entry.customerName.trim(), containerName: entry.containerName.trim(), quantity: 0 };
    current.quantity += entry.direction === "out" ? entry.quantity : -entry.quantity;
    balances.set(key, current);
  });
  return Array.from(balances.values()).filter((entry) => entry.quantity !== 0).sort((left, right) => right.quantity - left.quantity || left.customerName.localeCompare(right.customerName, "ar"));
};

export const getAvailableAlternatives = <Product extends { id: string; quantity: number }>(source: { alternativeProductIds?: string[] }, products: Product[]) => (source.alternativeProductIds ?? []).flatMap((id) => {
  const product = products.find((entry) => entry.id === id);
  return product && product.quantity > 0 ? [product] : [];
});
