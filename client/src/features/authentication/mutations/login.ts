import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";
import { authKeys } from "@/lib/query-keys";

export const useLogin = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => client.signInGoogle(),
		onSuccess: () => {
			// Invalidate the me query to refetch user data
			queryClient.invalidateQueries({ queryKey: authKeys.me() });
		},
	});
};
