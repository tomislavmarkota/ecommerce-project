import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct, CreateProductPayload } from '../api/product';

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
