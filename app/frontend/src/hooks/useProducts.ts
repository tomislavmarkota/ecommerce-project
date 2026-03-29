import { useQuery } from '@tanstack/react-query';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { fetchProducts } from '../api/product';

export const useProducts = (pagination: PaginationState, globalFilter: string, sorting: SortingState) => {
  const sort = sorting[0];

  return useQuery({
    queryKey: [
      'products',
      pagination.pageIndex,
      pagination.pageSize,
      globalFilter,
      sort?.id ?? 'created_at',
      sort?.desc ?? true,
    ],
    queryFn: () =>
      fetchProducts({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter.trim() || undefined,
        sortBy: sort?.id ?? 'created_at',
        sortOrder: sort?.desc ? 'DESC' : 'ASC',
      }),
    placeholderData: (previousData) => previousData,
  });
};
