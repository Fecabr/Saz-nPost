import { supabase } from './supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export const initAuthSubscription = () => {
  supabase.auth.onAuthStateChange((event, session) => {
    const { setSession } = useAuthStore.getState();

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      setSession(session);
    } else if (event === 'SIGNED_OUT') {
      setSession(null);
    } else if (event === 'USER_UPDATED') {
      setSession(session);
    }
  });

  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      toast.error('Error al restaurar sesión');
      return;
    }
    const { setSession } = useAuthStore.getState();
    setSession(session);
  });
};
