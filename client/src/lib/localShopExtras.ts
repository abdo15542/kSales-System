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

export const getReservationDueStatus = <Reservation extends { expiresOn?: string }>(reservations: Reservation[], date: string) => ({
  dueToday: reservations.filter((reservation) => reservation.expiresOn === date),
  overdue: reservations.filter((reservation) => Boolean(reservation.expiresOn && reservation.expiresOn < date)),
});

export const getMonthlyContainerReport = <Entry extends ContainerLedgerEntry & { createdAt: string }>(entries: Entry[], month: string) => {
  const groups = new Map<string, { containerName: string; delivered: number; returned: number; netChange: number }>();
  entries.filter((entry) => entry.createdAt.slice(0, 7) === month).forEach((entry) => {
    const current = groups.get(entry.containerName) ?? { containerName: entry.containerName, delivered: 0, returned: 0, netChange: 0 };
    current.delivered += entry.direction === "out" ? entry.quantity : 0;
    current.returned += entry.direction === "in" ? entry.quantity : 0;
    current.netChange += entry.direction === "out" ? entry.quantity : -entry.quantity;
    groups.set(entry.containerName, current);
  });
  const rows = Array.from(groups.values()).sort((left, right) => right.netChange - left.netChange || left.containerName.localeCompare(right.containerName, "ar"));
  const totals = rows.reduce((total, row) => ({ delivered: total.delivered + row.delivered, returned: total.returned + row.returned, netChange: total.netChange + row.netChange }), { delivered: 0, returned: 0, netChange: 0 });
  return { rows, totals };
};
