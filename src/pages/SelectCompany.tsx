import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { Building2, LogOut } from 'lucide-react';
import { fixCompanyData } from '../utils/fixCompanyData';

interface Company {
  id: string;
  name: string;
}

export function SelectCompany() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const session = useAuthStore((state) => state.session);
  const setCompany = useAuthStore((state) => state.setCompany);
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      toast.error('Debes iniciar sesión para continuar');
      navigate('/login');
      return;
    }
    loadCompanies();
  }, [session, navigate]);

  const loadCompanies = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('company_id, companies(id, name)')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const companiesList = data
        .map((item: any) => item.companies)
        .filter(Boolean) as Company[];

      setCompanies(companiesList);
    } catch (err: any) {
      toast.error('Error al cargar empresas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = async (companyId: string) => {
    try {
      await fixCompanyData(companyId);
      setCompany(companyId);
      navigate('/sales');
    } catch (error) {
      console.error('Error fixing company data:', error);
      toast.error('Error al configurar la empresa');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Sin empresas asignadas</h2>
          <p className="text-gray-600 mb-6">
            No tienes empresas asignadas. Pide acceso a un administrador.
          </p>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Seleccionar Empresa</h1>
            <p className="text-gray-600 mt-2">Elige una empresa para continuar</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-100"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                      {company.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectCompany(company.id)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition"
                >
                  Entrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
