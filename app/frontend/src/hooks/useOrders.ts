import { useQuery } from '@tanstack/react-query';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { fetchOrders } from '../api/order';

export const useOrders = (pagination: PaginationState, globalFilter: string, sorting: SortingState) => {
  const sort = sorting[0];

  return useQuery({
    queryKey: ['orders', pagination.pageIndex, pagination.pageSize, globalFilter, sorting],
    queryFn: () =>
      fetchOrders({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter,
        sortBy: sort?.id || 'created_at',
        sortOrder: sort?.desc ? 'DESC' : 'ASC',
      }),
  });
};
