import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";
import { authKeys } from "@/lib/query-keys";
import { useAnalytics } from "@/features/analytics/mutations/analytics";

export const useLogin = () => {
	const queryClient = useQueryClient();
	const { trackLogin } = useAnalytics();

	return useMutation({
		mutationFn: () => client.signInGoogle(),
		onSuccess: () => {
			// Invalidate the me query to refetch user data
			trackLogin()
			queryClient.invalidateQueries({ queryKey: authKeys.me() });
		},
	});
};
