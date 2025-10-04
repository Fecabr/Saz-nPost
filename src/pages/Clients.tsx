import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useRequireCompany } from '../hooks/useRequireCompany';
import { ArrowLeft, LogOut, HandCoins, Wallet, Package as PackageIcon, Users } from 'lucide-react';

interface Client {
  id: string;
  company_id: string;
  name: string;
  identification_type: string;
  identification_number: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface NewClientForm {
  name: string;
  identification_type: string;
  identification_number: string;
  email: string;
  phone: string;
}

const IDENTIFICATION_TYPES = [
  { value: 'fisica', label: 'Física' },
  { value: 'juridica', label: 'Jurídica' },
  { value: 'dimex', label: 'DIMEX' },
  { value: 'nite', label: 'NITE' },
  { value: 'otros', label: 'Otros' },
];

export function Clients() {
  const navigate = useNavigate();
  const companyId = useRequireCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewClientForm>({
    name: '',
    identification_type: 'fisica',
    identification_number: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (companyId) {
      loadClients();
    }
  }, [companyId]);

  const loadClients = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return false;
    }
    if (!form.identification_number.trim()) {
      toast.error('El número de identificación es requerido');
      return false;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('El formato del email no es válido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!companyId) {
      toast.error('No se ha seleccionado una empresa');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          company_id: companyId,
          name: form.name.trim(),
          identification_type: form.identification_type,
          identification_number: form.identification_number.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        });

      if (error) throw error;

      toast.success('Cliente creado exitosamente');
      setForm({
        name: '',
        identification_type: 'fisica',
        identification_number: '',
        email: '',
        phone: '',
      });
      setShowForm(false);
      await loadClients();
    } catch (error: any) {
      console.error('Error creating client:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un cliente con ese número de identificación');
      } else {
        toast.error('Error al crear cliente');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/sales')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver
              </button>
              <button
                onClick={() => navigate('/sales')}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                <HandCoins className="w-5 h-5" />
                Ventas
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition">
                  <PackageIcon className="w-5 h-5" />
                  Inventario
                </button>
                <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => navigate('/inventory/batches')}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-t-lg transition"
                  >
                    Lotes
                  </button>
                  <button
                    onClick={() => navigate('/inventory/items')}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-b-lg transition"
                  >
                    Ítems
                  </button>
                </div>
              </div>
              <button
                onClick={() => navigate('/cash')}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                <Wallet className="w-5 h-5" />
                Caja
              </button>
              <button
                onClick={() => navigate('/clients')}
                className="flex items-center gap-2 px-3 py-2 text-gray-900 bg-gray-100 rounded-lg transition"
              >
                <Users className="w-5 h-5" />
                Clientes
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  useAuthStore.getState().clearCompany();
                  navigate('/select-company');
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                Cambiar empresa
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Lista de Clientes</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {showForm ? 'Cancelar' : 'Nuevo Cliente'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo Cliente</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="identification_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Identificación <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="identification_type"
                    value={form.identification_type}
                    onChange={(e) => setForm({ ...form, identification_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {IDENTIFICATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="identification_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Identificación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="identification_number"
                    value={form.identification_number}
                    onChange={(e) => setForm({ ...form, identification_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Cargando clientes...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No hay clientes registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {IDENTIFICATION_TYPES.find(t => t.value === client.identification_type)?.label || client.identification_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.identification_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.phone || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
