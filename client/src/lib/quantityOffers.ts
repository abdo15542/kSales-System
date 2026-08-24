export type QuantityOffer = {
  minimumQuantity: number;
  discountPercent: number;
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
};

const normaliseOffer = (offer: QuantityOffer) => ({
  minimumQuantity: Math.max(1, Math.floor(Number(offer.minimumQuantity) || 0)),
  discountPercent: Math.min(100, Math.max(0, Number(offer.discountPercent) || 0)),
});

export const getBestQuantityOffer = (offers: QuantityOffer[] | undefined, quantity: number) => (offers ?? [])
  .map(normaliseOffer)
  .filter((offer) => offer.minimumQuantity <= quantity && offer.discountPercent > 0)
  .sort((left, right) => right.discountPercent - left.discountPercent || right.minimumQuantity - left.minimumQuantity)[0];

export const getCartQuantityOfferSummary = (items: QuantityOfferCartItem[]) => {
  const applied = items.flatMap<AppliedQuantityOffer>((item) => {
    const offer = getBestQuantityOffer(item.quantityOffers, item.cartQuantity);
    if (!offer) return [];
    return [{ productId: item.id, productName: item.name, minimumQuantity: offer.minimumQuantity, discountPercent: offer.discountPercent, discountAmount: item.salePrice * item.cartQuantity * (offer.discountPercent / 100) }];
  });
  return { applied, discountAmount: applied.reduce((total, offer) => total + offer.discountAmount, 0) };
};
