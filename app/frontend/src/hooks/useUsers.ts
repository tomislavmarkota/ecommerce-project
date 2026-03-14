import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../api/users';

export const useUsers = (pagination: any, globalFilter: string, sorting: any) => {
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
