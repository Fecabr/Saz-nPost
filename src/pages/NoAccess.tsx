import { XCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function NoAccess() {
  const navigate = useNavigate();
  const { clearSession } = useAuthStore();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearSession();
      toast.success('Sesión cerrada correctamente');
      navigate('/login');
    } catch (error: any) {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Sin Acceso</h1>
            <p className="text-gray-600 mb-6">
              Tu cuenta no tiene acceso a ninguna empresa. Pide a un administrador que te invite.
            </p>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 transition"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
