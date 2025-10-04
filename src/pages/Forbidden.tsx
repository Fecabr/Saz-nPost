import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-6xl font-bold text-gray-900 mb-4">403</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Acceso Prohibido</h2>
          <p className="text-gray-600 mb-8">
            No tienes permiso para acceder a este recurso. Por favor, verifica tus credenciales o contacta al administrador.
          </p>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition"
          >
            <Home className="w-5 h-5" />
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
