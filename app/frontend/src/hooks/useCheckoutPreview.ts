import { useQuery } from '@tanstack/react-query';
import { fetchCheckoutPreview } from '../api/checkout';

export const useCheckoutPreview = ({
  items,
  couponCode,
  enabled = true,
}: {
  items: { productId: number; quantity: number }[];
  couponCode?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['checkout-preview', items, couponCode],
    queryFn: () => fetchCheckoutPreview({ items, couponCode }),
    enabled: enabled && items.length > 0,
  });
};
