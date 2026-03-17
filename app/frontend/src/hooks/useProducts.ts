import { useQuery } from '@tanstack/react-query';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { fetchProducts } from '../api/product';

export const useProducts = (pagination: PaginationState, globalFilter: string, sorting: SortingState) => {
  return useQuery({
    queryKey: ['products', pagination.pageIndex, pagination.pageSize, globalFilter, sorting],
    queryFn: () =>
      fetchProducts({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        globalFilter,
        sorting: sorting.map((item) => ({
          id: item.id,
          desc: item.desc,
        })),
      }),
    placeholderData: (previousData) => previousData,
  });
};
