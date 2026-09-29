import { loginWithPassword } from "@/const";
import { trpc } from "@/lib/trpc";

export function useAuth() {
  const meQuery = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error,
    isAuthenticated: !!meQuery.data,
    logout: () => logoutMutation.mutate(),
    loginWithPassword: async (password: string) => {
      const result = await loginWithPassword(password);
      if (result.ok) {
        await meQuery.refetch();
      }
      return result;
    },
  };
}
