export type PricingSource = 'regular' | 'company_default' | 'company_product_override';

export type BaseProductPricing = {
  priceNet: number;
  vatRate: number;
  priceGross: number;
};

export type ProductPricingInput = BaseProductPricing;

export type ResolvedPrice = {
  productId: number;
  currency: string;
  originalNet: number;
  originalGross: number;
  vatRate: number;
  discountPercent: number;
  discountAmountNet: number;
  discountAmountGross: number;
  finalNet: number;
  finalGross: number;
  source: PricingSource;
  companyId: number | null;
  customerType: 'b2c' | 'b2b';
};

export type CatalogProduct = {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  isPublished: boolean;
  categoryId: number | null;
  categoryName: string | null;
  thumbnail: string | null;
  pricing: ResolvedPrice;
};
