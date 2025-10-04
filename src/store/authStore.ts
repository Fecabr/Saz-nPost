import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  companyId: string | null;
  setSession: (session: Session | null) => void;
  setCompany: (companyId: string) => void;
  clearCompany: () => void;
  clearSession: () => void;
}

const COMPANY_ID_KEY = 'company_id';

const getStoredCompanyId = (): string | null => {
  try {
    return localStorage.getItem(COMPANY_ID_KEY);
  } catch {
    return null;
  }
};

const setStoredCompanyId = (companyId: string | null): void => {
  try {
    if (companyId === null) {
      localStorage.removeItem(COMPANY_ID_KEY);
    } else {
      localStorage.setItem(COMPANY_ID_KEY, companyId);
    }
  } catch {
    // Ignore localStorage errors
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  companyId: getStoredCompanyId(),
  setSession: (session) => set({ session }),
  setCompany: (companyId) => {
    setStoredCompanyId(companyId);
    set({ companyId });
  },
  clearCompany: () => {
    setStoredCompanyId(null);
    set({ companyId: null });
  },
  clearSession: () => {
    setStoredCompanyId(null);
    set({ session: null, companyId: null });
  },
}));
