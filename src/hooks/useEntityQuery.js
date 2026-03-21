/**
 * Shared React Query hooks for entity CRUD with optimistic updates.
 * Usage:
 *   const { data, isLoading } = useEntityList('Book', { published: true }, 'order_index');
 *   const createMutation = useEntityCreate('Book');
 *   const updateMutation = useEntityUpdate('Book');
 *   const deleteMutation = useEntityDelete('Book');
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ── READ ──────────────────────────────────────────────────────────────────────

export function useEntityList(entityName, filters = null, sort = null, limit = 50) {
  return useQuery({
    queryKey: [entityName, 'list', filters, sort],
    queryFn: () =>
      filters
        ? base44.entities[entityName].filter(filters, sort, limit)
        : base44.entities[entityName].list(sort, limit),
    staleTime: 30_000,
  });
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export function useEntityCreate(entityName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: [entityName] });
      const snapshots = queryClient.getQueriesData({ queryKey: [entityName] });
      queryClient.setQueriesData({ queryKey: [entityName] }, (old) => {
        if (!Array.isArray(old)) return old;
        return [{ id: `optimistic-${Date.now()}`, ...newItem }, ...old];
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots?.forEach(([key, val]) => queryClient.setQueryData(key, val));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
  });
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export function useEntityUpdate(entityName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: [entityName] });
      const snapshots = queryClient.getQueriesData({ queryKey: [entityName] });
      queryClient.setQueriesData({ queryKey: [entityName] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((item) => (item.id === id ? { ...item, ...data } : item));
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots?.forEach(([key, val]) => queryClient.setQueryData(key, val));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
  });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export function useEntityDelete(entityName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [entityName] });
      const snapshots = queryClient.getQueriesData({ queryKey: [entityName] });
      queryClient.setQueriesData({ queryKey: [entityName] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item) => item.id !== id);
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots?.forEach(([key, val]) => queryClient.setQueryData(key, val));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
  });
}