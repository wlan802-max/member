import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/client';

type Notification = Database['public']['Tables']['notifications']['Row'];

export function useNotifications(profileId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profileId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profileId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profileId) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profileId] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
