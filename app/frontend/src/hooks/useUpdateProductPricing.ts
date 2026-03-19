import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProductPricing, UpdateProductPricingPayload } from '../api/product';

export const useUpdateProductPricing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, payload }: { productId: number; payload: UpdateProductPricingPayload }) =>
      updateProductPricing(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
