import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export const useCompanyGuard = () => {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const companyId = useAuthStore((state) => state.companyId);

  useEffect(() => {
    if (!session) {
      toast.error('Debes iniciar sesión para continuar');
      navigate('/login');
      return;
    }

    if (!companyId) {
      toast.error('Debes seleccionar una empresa para continuar');
      navigate('/select-company');
      return;
    }
  }, [session, companyId, navigate]);

  return { session, companyId };
};
