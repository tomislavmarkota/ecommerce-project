import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProductsBulk } from '../api/product';

export const useDeleteProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => deleteProductsBulk(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
