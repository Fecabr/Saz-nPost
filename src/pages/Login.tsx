import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { LogIn } from 'lucide-react';
import { processUserInvitations } from '../services/invitationService';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const { setSession, companyId } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) throw signInError;

      const user = signInData.user;
      setSession(signInData.session);
      toast.success('Inicio de sesión exitoso');

      const { data: memberships, error } = await supabase
        .from('user_company_roles')
        .select('company_id, role, companies(name)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error al cargar membresías:', error);
        toast.error('Error al cargar las empresas del usuario');
        return;
      }

      console.log({ userId: user.id, count: memberships?.length || 0 });

      if (!memberships || memberships.length === 0) {
        navigate('/no-access');
        return;
      }

      if (memberships.length === 1) {
        useAuthStore.getState().setCompany(memberships[0].company_id);
        navigate('/sales');
        return;
      }

      if (!companyId) {
        navigate('/select-company');
      } else {
        navigate('/sales');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la solicitud');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h1>
            <p className="text-gray-600 mt-2">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Procesando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
