import { getPriceListContextForUser, resolveProductPrice } from '../product-pricing.service';
import { calculateCouponDiscount, validateCouponForCheckout } from '../couponService/coupon.service';

export const buildCheckoutPreview = async ({
  items,
  userId,
  couponCode,
}: {
  items: { productId: number; quantity: number }[];
  userId?: number | null;
  couponCode?: string;
}) => {
  const pricingContext = await getPriceListContextForUser(userId ?? null);

  const resolvedItems = [];

  for (const item of items) {
    const resolvedPrice = await resolveProductPrice(item.productId, userId ?? null);

    if (!resolvedPrice) {
      throw new Error(`Pricing not found for product ${item.productId}`);
    }

    resolvedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      original_unit_price: resolvedPrice.originalGross,
      unit_price: resolvedPrice.finalGross,
      discount_amount: (resolvedPrice.originalGross - resolvedPrice.finalGross) * item.quantity,
      total_price: resolvedPrice.finalGross * item.quantity,
      applied_discount_id: resolvedPrice.appliedDiscount?.id ?? null,
      applied_discount_name: resolvedPrice.appliedDiscount?.name ?? null,
    });
  }

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.total_price, 0);

  const coupon = couponCode
    ? await validateCouponForCheckout({
        code: couponCode,
        customerGroupId: pricingContext.customerGroupId,
        subtotal,
        userId: userId ?? null,
      })
    : null;

  const couponDiscount = calculateCouponDiscount(subtotal, coupon);
  const grandTotal = Math.max(0, subtotal - couponDiscount);

  return {
    customerGroupCode: pricingContext.customerGroupCode,
    items: resolvedItems,
    subtotal,
    coupon: coupon
      ? {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: couponDiscount,
        }
      : null,
    grandTotal,
  };
};
