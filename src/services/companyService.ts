import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface UserCompanyRole {
  company_id: string;
  role: string;
  companies: Company;
}

export const getUserCompanies = async (): Promise<Company[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Usuario no autenticado');
      return [];
    }

    const { data, error } = await supabase
      .from('user_company_roles')
      .select('company_id, role, companies(id, name, created_at)')
      .eq('user_id', user.id);

    if (error) {
      toast.error('Error al cargar las empresas');
      console.error('Error fetching user companies:', error);
      return [];
    }

    return (data as UserCompanyRole[]).map(ucr => ucr.companies);
  } catch (error) {
    toast.error('Error inesperado al cargar las empresas');
    console.error('Unexpected error in getUserCompanies:', error);
    return [];
  }
};
