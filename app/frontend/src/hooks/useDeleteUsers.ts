import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUsers } from '../api/users';

type DeleteUsersPayload = {
  ids: number[];
  token: string;
};

export const useDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, token }: DeleteUsersPayload) => deleteUsers(ids, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
