import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Mail, Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRequireCompany } from '../hooks/useRequireCompany';

interface Member {
  user_id: string;
  email: string;
  role: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const invitationSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  role: z.enum(['admin', 'cashier', 'waiter', 'kitchen'], {
    errorMap: () => ({ message: 'Selecciona un rol válido' }),
  }),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

export function Members() {
  const navigate = useNavigate();
  const companyId = useRequireCompany();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
  });

  useEffect(() => {
    if (companyId) {
      loadMembers();
      loadInvitations();
    }
  }, [companyId]);

  const loadMembers = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('user_id, role')
        .eq('company_id', companyId);

      if (error) throw error;

      const userIds = data.map((m) => m.user_id);
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) throw usersError;

      const membersWithEmails = data.map((member) => {
        const user = users.users.find((u) => u.id === member.user_id);
        return {
          user_id: member.user_id,
          email: user?.email || 'N/A',
          role: member.role,
        };
      });

      setMembers(membersWithEmails);
    } catch (err: any) {
      toast.error('Error al cargar miembros');
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(data || []);
    } catch (err: any) {
      toast.error('Error al cargar invitaciones');
    }
  };

  const onSubmitInvitation = async (data: InvitationFormData) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from('invitations').insert({
        company_id: companyId,
        email: data.email,
        role: data.role,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Invitación enviada exitosamente');
      reset();
      setShowInviteModal(false);
      loadInvitations();
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar invitación');
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta invitación?')) return;

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitación cancelada');
      loadInvitations();
    } catch (err: any) {
      toast.error('Error al cancelar invitación');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      cashier: 'Cajero',
      waiter: 'Mesero',
      kitchen: 'Cocina',
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Gestión de Miembros</h1>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <UserPlus className="w-5 h-5" />
              Invitar Usuario
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Miembros Activos</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Rol
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-center py-8 text-gray-500">
                            No hay miembros
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr key={member.user_id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{member.email}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {getRoleLabel(member.role)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {invitations.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Invitaciones Pendientes</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">
                            Rol
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">
                            Fecha
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((invitation) => (
                          <tr key={invitation.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{invitation.email}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                {getRoleLabel(invitation.role)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {new Date(invitation.created_at).toLocaleDateString('es-ES')}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleDeleteInvitation(invitation.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Invitar Usuario</h2>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitInvitation)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="usuario@ejemplo.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  id="role"
                  {...register('role')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Seleccionar rol</option>
                  <option value="admin">Administrador</option>
                  <option value="cashier">Cajero</option>
                  <option value="waiter">Mesero</option>
                  <option value="kitchen">Cocina</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    reset();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
