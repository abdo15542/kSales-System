export type QuantityOffer = {
  minimumQuantity: number;
  discountPercent: number;
  startDate?: string;
  endDate?: string;
};

export type QuantityOfferCartItem = {
  id: string;
  name: string;
  salePrice: number;
  cartQuantity: number;
  quantityOffers?: QuantityOffer[];
};

export type AppliedQuantityOffer = {
  productId: string;
  productName: string;
  minimumQuantity: number;
  discountPercent: number;
  discountAmount: number;
  startDate?: string;
  endDate?: string;
};

const isDateKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const todayKey = () => new Date().toISOString().slice(0, 10);

const normaliseOffer = (offer: QuantityOffer) => {
  const startDate = isDateKey(offer.startDate) ? offer.startDate : "";
  const rawEndDate = isDateKey(offer.endDate) ? offer.endDate : "";
  const endDate = rawEndDate && (!startDate || rawEndDate >= startDate) ? rawEndDate : "";
  return {
    minimumQuantity: Math.max(1, Math.floor(Number(offer.minimumQuantity) || 0)),
    discountPercent: Math.min(100, Math.max(0, Number(offer.discountPercent) || 0)),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
};

export const isQuantityOfferActive = (offer: QuantityOffer, date = todayKey()) => {
  const normalised = normaliseOffer(offer);
  return (!normalised.startDate || normalised.startDate <= date) && (!normalised.endDate || normalised.endDate >= date);
};

export const getBestQuantityOffer = (offers: QuantityOffer[] | undefined, quantity: number, date = todayKey()) => (offers ?? [])
  .map(normaliseOffer)
  .filter((offer) => offer.minimumQuantity <= quantity && offer.discountPercent > 0 && isQuantityOfferActive(offer, date))
  .sort((left, right) => right.discountPercent - left.discountPercent || right.minimumQuantity - left.minimumQuantity)[0];

export const getCartQuantityOfferSummary = (items: QuantityOfferCartItem[]) => {
  const applied = items.flatMap<AppliedQuantityOffer>((item) => {
    const offer = getBestQuantityOffer(item.quantityOffers, item.cartQuantity);
    if (!offer) return [];
    return [{ productId: item.id, productName: item.name, minimumQuantity: offer.minimumQuantity, discountPercent: offer.discountPercent, discountAmount: item.salePrice * item.cartQuantity * (offer.discountPercent / 100), startDate: offer.startDate || undefined, endDate: offer.endDate || undefined }];
  });
  return { applied, discountAmount: applied.reduce((total, offer) => total + offer.discountAmount, 0) };
};
