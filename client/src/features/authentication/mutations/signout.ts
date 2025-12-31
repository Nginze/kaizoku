import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";
import { authKeys } from "@/lib/query-keys";

export const useSignout = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => client.signOut(),
		onSuccess: () => {
			// Clear all auth queries
			queryClient.clear();
		},
	});
};
