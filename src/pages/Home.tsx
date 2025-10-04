import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, ArrowRight, LogOut } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Sistema de Ventas</span>
            </div>
            {user && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Bienvenido al Sistema de Ventas
          </h1>
          <p className="text-xl text-gray-600">
            Gestiona tus empresas y ventas de manera eficiente y segura
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Gestión de Empresas
            </h3>
            <p className="text-gray-600 mb-4">
              Administra múltiples empresas desde un solo lugar. Crea, edita y elimina empresas según tus necesidades.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Panel de Ventas
            </h3>
            <p className="text-gray-600 mb-4">
              Accede a un panel completo para gestionar tus ventas con estadísticas y métricas en tiempo real.
            </p>
          </div>
        </div>

        <div className="text-center">
          {user ? (
            <button
              onClick={() => navigate('/select-company')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition shadow-lg hover:shadow-xl"
            >
              Ir a Mis Empresas
              <ArrowRight className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition shadow-lg hover:shadow-xl"
            >
              Iniciar Sesión
              <ArrowRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
