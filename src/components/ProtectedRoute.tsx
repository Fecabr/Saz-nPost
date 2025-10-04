import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';

type Role = 'admin' | 'cashier' | 'waiter' | 'kitchen';

interface ProtectedRouteProps {
  children: ReactNode;
  requireCompany?: boolean;
  roles?: Role[];
}

export const ProtectedRoute = ({ children, requireCompany = true, roles }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const companyId = useAuthStore((state) => state.companyId);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!session) {
        navigate('/login');
        return;
      }

      const allowedWithoutCompany = ['/select-company', '/no-access'];
      if (!companyId) {
        if (requireCompany && !allowedWithoutCompany.includes(location.pathname)) {
          navigate('/select-company');
          return;
        }
        if (!requireCompany) {
          setIsAuthorized(true);
          return;
        }
      }

      if (!roles || roles.length === 0) {
        setIsAuthorized(true);
        return;
      }

      if (!companyId) {
        setIsAuthorized(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_company_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error || !data) {
        toast.error('No tienes acceso a esta empresa');
        navigate('/403');
        return;
      }

      if (!roles.includes(data.role as Role)) {
        toast.error('No tienes permisos para acceder a esta página');
        navigate('/403');
        return;
      }

      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [session, companyId, roles, requireCompany, navigate, location.pathname]);

  if (isAuthorized === null) {
    return null;
  }

  return isAuthorized ? <>{children}</> : null;
};
