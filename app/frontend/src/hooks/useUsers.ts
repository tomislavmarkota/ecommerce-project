import { useQuery } from '@tanstack/react-query';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { getUsers } from '../api/users';

export const useUsers = (pagination: PaginationState, globalFilter: string, sorting: SortingState) => {
  return useQuery({
    queryKey: ['users', pagination, globalFilter, sorting],
    queryFn: () =>
      getUsers({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter,
        sorting,
      }),
    keepPreviousData: true,
  });
};
