export type ScannedCartItem<T extends { id: string }> = T & { cartQuantity: number };

export type ScannedCartUpdate<T extends { id: string }> = {
  cart: ScannedCartItem<T>[];
  added: boolean;
  quantity: number;
};

/** يرفع كمية السطر نفسه مع كل مسح، ولا ينشئ سطرًا جديدًا للصنف نفسه. */
export const addScannedProductToCart = <T extends { id: string; quantity: number }>(cart: ScannedCartItem<T>[], product: T): ScannedCartUpdate<T> => {
  const currentItem = cart.find((item) => item.id === product.id);
  if (currentItem) {
    if (currentItem.cartQuantity >= product.quantity) return { cart, added: false, quantity: currentItem.cartQuantity };
    const quantity = currentItem.cartQuantity + 1;
    return { cart: cart.map((item) => item.id === product.id ? { ...item, cartQuantity: quantity } : item), added: true, quantity };
  }
  return { cart: [...cart, { ...product, cartQuantity: 1 }], added: true, quantity: 1 };
};
