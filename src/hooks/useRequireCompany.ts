import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function useRequireCompany() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const companyId = useAuthStore((state) => state.companyId);

  useEffect(() => {
    if (!session) {
      navigate('/login');
      return;
    }

    const allowedRoutes = ['/select-company', '/no-access'];
    if (!companyId && !allowedRoutes.includes(location.pathname)) {
      navigate('/select-company');
    }
  }, [session, companyId, location.pathname, navigate]);

  return companyId;
}
