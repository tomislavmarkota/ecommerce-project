import { useMutation } from '@tanstack/react-query';
import { createOrder } from '../api/checkout';

export const useCreateOrder = () => {
  return useMutation({
    mutationFn: createOrder,
  });
};
