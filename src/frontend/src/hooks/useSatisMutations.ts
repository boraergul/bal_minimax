import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SatisCreateRequest, Satis } from '@/types'

/**
 * Satış (Satis) mutation hooks
 * Handles create, update, and delete operations for sales
 */
export function useSatisMutations() {
  const queryClient = useQueryClient()

  // Create new sale
  const createMutation = useMutation({
    mutationFn: async (data: SatisCreateRequest) => {
      const response = await api.post<Satis>('/satis', data)
      return response.data
    },
    onSuccess: (data) => {
      // Invalidate sales list cache
      queryClient.invalidateQueries({ queryKey: ['satis-listesi'] })
      
      // Add to cache if needed
      if (data?.id) {
        queryClient.setQueryData(['satis-detay', data.id], data)
      }
      
      return data
    },
  })

  // Update existing sale
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SatisCreateRequest> }) => {
      const response = await api.patch<Satis>(`/satis/${id}`, data)
      return response.data
    },
    onSuccess: (data, variables) => {
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['satis-listesi'] })
      queryClient.invalidateQueries({ queryKey: ['satis-detay', variables.id] })
      
      // Update cache
      if (data) {
        queryClient.setQueryData(['satis-detay', variables.id], data)
      }
      
      return data
    },
  })

  // Cancel sale
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/satis/${id}/iptal`)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['satis-listesi'] })
      queryClient.invalidateQueries({ queryKey: ['satis-detay', id] })
    },
  })

  // Delete sale (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/satis/${id}`)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['satis-listesi'] })
      queryClient.invalidateQueries({ queryKey: ['satis-detay', id] })
    },
  })

  return {
    // Mutation functions
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    cancel: cancelMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,

    // Sync versions (for use with await)
    createAsync: createMutation.mutateAsync,
    updateAsync: updateMutation.mutateAsync,
    cancelAsync: cancelMutation.mutateAsync,
    deleteAsync: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Error states
    createError: createMutation.error,
    updateError: updateMutation.error,
    cancelError: cancelMutation.error,
    deleteError: deleteMutation.error,

    // Reset functions
    resetCreate: createMutation.reset,
    resetUpdate: updateMutation.reset,
    resetCancel: cancelMutation.reset,
    resetDelete: deleteMutation.reset,
  }
}

/**
 * Hook for fetching sale details
 * Provides convenience methods for common operations
 */
export function useSatisDetail(satisId: string | undefined) {
  const queryClient = useQueryClient()
  const mutations = useSatisMutations()

  // Get cached data
  const getCachedData = (): Satis | undefined => {
    if (!satisId) return undefined
    return queryClient.getQueryData(['satis-detay', satisId])
  }

  return {
    // Cached data
    cachedData: getCachedData(),

    // Mutation shortcuts (they'll auto-invalidate)
    update: mutations.update,
    cancel: mutations.cancel,

    // State shortcuts
    isUpdating: mutations.isUpdating,
    isCancelling: mutations.isCancelling,

    // Error shortcuts
    updateError: mutations.updateError,
    cancelError: mutations.cancelError,
  }
}

export default useSatisMutations
