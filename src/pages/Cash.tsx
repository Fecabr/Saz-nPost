import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { formatCRC } from '../lib/currency';
import { useRequireCompany } from '../hooks/useRequireCompany';

interface CashSession {
  id: string;
  company_id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  status: 'open' | 'closed';
  user_email?: string;
}

interface CashMovement {
  id: string;
  company_id: string;
  session_id: string;
  type: 'sale' | 'in' | 'out' | 'adjust';
  amount: number;
  note: string | null;
  created_at: string;
}

export const Cash = () => {
  const navigate = useNavigate();
  const selectedCompanyId = useRequireCompany();

  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const [openingAmount, setOpeningAmount] = useState(0);
  const [opening, setOpening] = useState(false);

  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [movementAmount, setMovementAmount] = useState(0);
  const [movementNote, setMovementNote] = useState('');
  const [movementLoading, setMovementLoading] = useState(false);

  const [closingAmount, setClosingAmount] = useState(0);
  const [closingLoading, setClosingLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCompanyId]);

  const loadData = async () => {
    if (!selectedCompanyId) return;

    setLoading(true);

    try {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', selectedCompanyId)
        .maybeSingle();

      setCompanyName(company?.name || 'Empresa');
    } catch (error) {
      console.error('Error loading company:', error);
    }
    try {
      const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select(`
          *,
          user_email:user_id (
            email
          )
        `)
        .eq('company_id', selectedCompanyId)
        .eq('status', 'open')
        .maybeSingle();

      if (session && session.user_email && typeof session.user_email === 'object') {
        session.user_email = (session.user_email as any).email;
      }

      if (sessionError) {
        console.error('Error loading session:', sessionError);
        throw new Error('Error al cargar la sesión de caja');
      }

      setCurrentSession(session);

      if (session) {
        const { data: movementsData, error: movementsError } = await supabase
          .from('cash_movements')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false });

        if (movementsError) {
          console.error('Error loading movements:', movementsError);
          throw new Error('Error al cargar los movimientos');
        }

        setMovements(movementsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompanyId) return;

    if (openingAmount < 0) {
      toast.error('El monto inicial debe ser mayor o igual a 0');
      return;
    }

    setOpening(true);

    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          company_id: selectedCompanyId,
          opening_amount: openingAmount,
        })
        .select()
        .single();

      if (error) {
        console.error('Error opening session:', error);
        throw new Error('Error al abrir la caja');
      }

      toast.success('Caja abierta exitosamente');
      setCurrentSession(data);
      setOpeningAmount(0);
    } catch (error) {
      console.error('Error opening session:', error);
      toast.error(error instanceof Error ? error.message : 'Error al abrir la caja');
    } finally {
      setOpening(false);
    }
  };

  const handleAddMovement = async (type: 'in' | 'out') => {
    if (!selectedCompanyId || !currentSession) return;

    if (movementAmount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setMovementLoading(true);

    try {
      const { error } = await supabase
        .from('cash_movements')
        .insert({
          company_id: selectedCompanyId,
          session_id: currentSession.id,
          type,
          amount: movementAmount,
          note: movementNote.trim() || null,
        });

      if (error) {
        console.error('Error adding movement:', error);
        throw new Error('Error al registrar el movimiento');
      }

      toast.success('Movimiento registrado exitosamente');
      setMovementAmount(0);
      setMovementNote('');
      setShowInModal(false);
      setShowOutModal(false);
      await loadData();
    } catch (error) {
      console.error('Error adding movement:', error);
      toast.error(error instanceof Error ? error.message : 'Error al registrar el movimiento');
    } finally {
      setMovementLoading(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompanyId || !currentSession) return;

    if (closingAmount < 0) {
      toast.error('El monto final debe ser mayor o igual a 0');
      return;
    }

    setClosingLoading(true);

    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closing_amount: closingAmount,
        })
        .eq('id', currentSession.id);

      if (error) {
        console.error('Error closing session:', error);
        throw new Error('Error al cerrar la caja');
      }

      toast.success('Caja cerrada exitosamente');
      setCurrentSession(null);
      setMovements([]);
      setClosingAmount(0);
      setShowCloseModal(false);
      await loadData();
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cerrar la caja');
    } finally {
      setClosingLoading(false);
    }
  };

  const calculateCurrentTotal = () => {
    if (!currentSession) return 0;

    const movementsTotal = movements.reduce((acc, movement) => {
      if (movement.type === 'in' || movement.type === 'sale') {
        return acc + Number(movement.amount);
      } else if (movement.type === 'out') {
        return acc - Number(movement.amount);
      } else if (movement.type === 'adjust') {
        return acc + Number(movement.amount);
      }
      return acc;
    }, 0);

    return Number(currentSession.opening_amount) + movementsTotal;
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'sale':
        return 'Venta';
      case 'in':
        return 'Ingreso';
      case 'out':
        return 'Egreso';
      case 'adjust':
        return 'Ajuste';
      default:
        return type;
    }
  };

  const handlePrintReconciliation = () => {
    const salesMovements = movements.filter(m => m.type === 'sale');
    const salesTotal = salesMovements.reduce((acc, m) => acc + Number(m.amount), 0);
    const expectedTotal = calculateCurrentTotal();
    const difference = closingAmount - expectedTotal;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Arqueo de Caja</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              text-align: center;
              margin-bottom: 10px;
            }
            .company {
              text-align: center;
              font-size: 18px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 20px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .label {
              font-weight: 600;
            }
            .total-row {
              font-size: 18px;
              font-weight: bold;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 2px solid #000;
            }
            .difference {
              color: ${difference === 0 ? '#16a34a' : difference > 0 ? '#2563eb' : '#dc2626'};
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>Arqueo de Caja</h1>
          <div class="company">{companyName}</div>

          <div class="section">
            <div class="row">
              <span class="label">Cajero:</span>
              <span>{currentSession?.user_email || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Fecha de Apertura:</span>
              <span>{new Date(currentSession?.opened_at || '').toLocaleString('es-ES')}</span>
            </div>
            <div class="row">
              <span class="label">Monto Inicial:</span>
              <span>{formatCRC(currentSession?.opening_amount || 0)}</span>
            </div>
          </div>

          <div class="section">
            <h3>Movimientos</h3>
            <div class="row">
              <span class="label">Ventas Registradas ({salesMovements.length}):</span>
              <span>{formatCRC(salesTotal)}</span>
            </div>
            <div class="row">
              <span class="label">Otros Ingresos:</span>
              <span>{formatCRC(movements.filter(m => m.type === 'in').reduce((acc, m) => acc + Number(m.amount), 0))}</span>
            </div>
            <div class="row">
              <span class="label">Egresos:</span>
              <span>{formatCRC(movements.filter(m => m.type === 'out').reduce((acc, m) => acc + Number(m.amount), 0))}</span>
            </div>
            <div class="row">
              <span class="label">Ajustes:</span>
              <span>{formatCRC(movements.filter(m => m.type === 'adjust').reduce((acc, m) => acc + Number(m.amount), 0))}</span>
            </div>
          </div>

          <div class="section">
            <div class="row total-row">
              <span class="label">Total Esperado:</span>
              <span>{formatCRC(expectedTotal)}</span>
            </div>
            <div class="row total-row">
              <span class="label">Monto Contado:</span>
              <span>{formatCRC(closingAmount)}</span>
            </div>
            <div class="row total-row">
              <span class="label">Diferencia:</span>
              <span class="difference">{formatCRC(difference)}</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/select-company')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <button
            onClick={() => navigate('/sales')}
            className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Ventas
          </button>
          <button
            onClick={() => navigate('/inventory/batches')}
            className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Lotes
          </button>
          <button
            onClick={() => navigate('/inventory/items')}
            className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Ítems
          </button>
          <button
            onClick={() => navigate('/cash')}
            className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Caja
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Wallet className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold">Gestión de Caja</h1>
          </div>

          {!currentSession ? (
            <div>
              <h2 className="text-lg font-semibold mb-4">Abrir Caja</h2>
              <form onSubmit={handleOpenSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Inicial
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingAmount || ''}
                    onChange={(e) => setOpeningAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400"
                  disabled={opening}
                >
                  {opening ? 'Abriendo...' : 'Abrir Caja'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total en Caja</div>
                <div className="text-3xl font-bold text-green-700">
                  {formatCRC(calculateCurrentTotal())}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Monto inicial: {formatCRC(Number(currentSession.opening_amount))}
                </div>
                {currentSession.user_email && (
                  <div className="text-sm text-gray-600 mt-1">
                    Caja abierta por: {currentSession.user_email}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setShowInModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <TrendingUp className="w-4 h-4" />
                  Ingreso
                </button>
                <button
                  onClick={() => setShowOutModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  <TrendingDown className="w-4 h-4" />
                  Egreso
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Cerrar Caja
                </button>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Movimientos</h3>
                {movements.length === 0 ? (
                  <p className="text-gray-600">No hay movimientos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {movements.map((movement) => (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div>
                          <div className="font-medium">
                            {getMovementTypeLabel(movement.type)}
                          </div>
                          {movement.note && (
                            <div className="text-sm text-gray-600">{movement.note}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            {new Date(movement.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div
                          className={`font-semibold ${
                            movement.type === 'out'
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {movement.type === 'out' ? '-' : '+'}
                          {formatCRC(Number(movement.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Registrar Ingreso</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddMovement('in');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={movementAmount || ''}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota (Opcional)
                </label>
                <input
                  type="text"
                  value={movementNote}
                  onChange={(e) => setMovementNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowInModal(false);
                    setMovementAmount(0);
                    setMovementNote('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={movementLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={movementLoading}
                >
                  {movementLoading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Registrar Egreso</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddMovement('out');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={movementAmount || ''}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota (Opcional)
                </label>
                <input
                  type="text"
                  value={movementNote}
                  onChange={(e) => setMovementNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowOutModal(false);
                    setMovementAmount(0);
                    setMovementNote('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={movementLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-400"
                  disabled={movementLoading}
                >
                  {movementLoading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Cerrar Caja</h2>
            <form onSubmit={handleCloseSession} className="space-y-4">
              {currentSession?.user_email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cajero
                  </label>
                  <input
                    type="text"
                    value={currentSession.user_email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Esperado
                </label>
                <input
                  type="text"
                  value={formatCRC(calculateCurrentTotal())}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Final Contado
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closingAmount || ''}
                  onChange={(e) => setClosingAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {closingAmount > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Diferencia
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      closingAmount - calculateCurrentTotal() === 0
                        ? 'text-green-600'
                        : closingAmount - calculateCurrentTotal() > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCRC(closingAmount - calculateCurrentTotal())}
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-between">
                <button
                  type="button"
                  onClick={handlePrintReconciliation}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  disabled={closingLoading || closingAmount === 0}
                >
                  Imprimir Arqueo
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCloseModal(false);
                      setClosingAmount(0);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={closingLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
                    disabled={closingLoading}
                  >
                    {closingLoading ? 'Cerrando...' : 'Cerrar Caja'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
