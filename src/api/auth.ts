import { api } from './client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useMeQuery(enabled: boolean = true) {
	return useQuery({
		queryKey: ['me'],
		queryFn: async () => {
			const { data } = await api.get('/auth/me');
			return data.user;
		},
		enabled,
	});
}

export function useLogoutMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			await api.post('/auth/logout');
		},
		onSuccess: () => {
			qc.removeQueries({ queryKey: ['me'] });
		},
	});
}
