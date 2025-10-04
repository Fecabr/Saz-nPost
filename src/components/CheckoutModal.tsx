import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { formatCurrencyCRC } from '../utils/currency';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  onConfirmed: (payment: {
    method: string;
    amount_cash: number;
    amount_card: number;
    emit_invoice: boolean;
    client_id?: string;
  }) => Promise<void>;
  isPaying?: boolean;
}

interface Client {
  id: string;
  name: string;
  identification_number: string;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  total,
  onConfirmed,
  isPaying = false,
}: CheckoutModalProps) {
  const [method, setMethod] = useState<'efectivo' | 'tarjeta' | 'mixto'>('efectivo');
  const [amountReceived, setAmountReceived] = useState(''); // solo efectivo
  const [amountCash, setAmountCash] = useState(''); // mixto
  const [amountCard, setAmountCard] = useState(''); // mixto
  const [error, setError] = useState('');
  const [emitInvoice, setEmitInvoice] = useState(false);

  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [noClientsMessage, setNoClientsMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const companyId = useAuthStore((state) => state.selectedCompanyId);

  // Resetear el modal al abrir/cerrar
  useEffect(() => {
    if (!isOpen) return;
    setMethod('efectivo');
    setAmountReceived('');
    setAmountCash('');
    setAmountCard('');
    setError('');
    setEmitInvoice(false);
    setClientId(undefined);
    setClientSearch('');
    setClientResults([]);
    setSelectedClient(null);
    setShowClientDropdown(false);
    setNoClientsMessage('');
    console.log("Dentro");
  }, [isOpen]);

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (emitInvoice && clientSearch.trim().length > 0 && companyId) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        searchClients(clientSearch.trim());
      }, 300);
    } else {
      setClientResults([]);
      setShowClientDropdown(false);
      setNoClientsMessage('');
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [clientSearch, emitInvoice, companyId]);

  const searchClients = async (query: string) => {
    if (!companyId) return;
    setLoadingClients(true);
    setNoClientsMessage('');
    try {
      const { data, error } = await supabase.rpc('search_clients', {
        q: query,
        company: companyId,
      });
      if (error) throw error;

      if (!data || data.length === 0) {
        setNoClientsMessage('No hay clientes, crea uno en /clientes');
        setClientResults([]);
      } else {
        setClientResults(data);
        setNoClientsMessage('');
      }
      setShowClientDropdown(true);
    } catch (err) {
      console.error('Error searching clients:', err);
      setClientResults([]);
      setNoClientsMessage('Error al buscar clientes');
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientId(client.id);
    setClientSearch(`${client.name} (${client.identification_number})`);
    setShowClientDropdown(false);
    setError('');
  };

  if (!isOpen) return null;

  const calculateChange = () => {
    if (method === 'efectivo' && amountReceived) {
      const received = Number(amountReceived);
      if (Number.isFinite(received)) return received - total;
    }
    return 0;
  };

  const confirmWith = async (payload: {
    method: 'efectivo' | 'tarjeta' | 'mixto';
    amount_cash: number;
    amount_card: number;
  }) => {
    setIsSubmitting(true);
    try {
      await onConfirmed({
        method: payload.method,
        amount_cash: payload.amount_cash,
        amount_card: payload.amount_card,
        emit_invoice: emitInvoice,
        client_id: clientId,
      });
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      toast.error(err?.message || 'Error al procesar la venta');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  };

  const handleConfirm = async () => {
    setError('');

    if (emitInvoice && !clientId) {
      setError('Debe seleccionar un cliente para factura nominativa');
      return;
    }

    if (method === 'efectivo') {
      const received = Number(amountReceived);
      if (!amountReceived || !Number.isFinite(received)) {
        setError('Ingrese el monto recibido');
        return;
      }
      if (received < total) {
        setError('El monto recibido es insuficiente');
        return;
      }
      // En caja entra el neto (total). El cambio se entrega y no permanece.
      await confirmWith({ method: 'efectivo', amount_cash: total, amount_card: 0 });
    } else if (method === 'tarjeta') {
      await confirmWith({ method: 'tarjeta', amount_cash: 0, amount_card: total });
    } else {
      const cash = Number(amountCash);
      const card = Number(amountCard);
      if (!amountCash || !Number.isFinite(cash)) {
        setError('Ingrese el monto en efectivo');
        return;
      }
      if (!amountCard || !Number.isFinite(card)) {
        setError('Ingrese el monto con tarjeta');
        return;
      }
      if (cash + card !== total) {
        setError('La suma de efectivo y tarjeta debe ser igual al total');
        return;
      }
      await confirmWith({ method: 'mixto', amount_cash: cash, amount_card: card });
    }
  };

  const change = calculateChange();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Confirmar Venta</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Resumen */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Resumen</h3>
            <div className="space-y-1 text-sm">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {item.qty}x {item.name}
                  </span>
                  <span>{formatCurrencyCRC(item.qty * item.price)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrencyCRC(total)}</span>
            </div>
          </div>

          {/* Método */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Método de Pago</label>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as 'efectivo' | 'tarjeta' | 'mixto');
                setError('');
              }}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          {/* Efectivo */}
          {method === 'efectivo' && (
            <>
              <div className="mb-2">
                <label className="block text-sm font-medium mb-2">Monto Recibido</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
              {amountReceived && change >= 0 && (
                <div className="text-sm text-gray-600 mb-4">
                  Vuelto: <span className="font-semibold">{formatCurrencyCRC(change)}</span>
                </div>
              )}
              {amountReceived && Number(amountReceived) < total && (
                <div className="text-sm text-red-600 mb-4">
                  El monto recibido debe ser mayor o igual al total
                </div>
              )}
            </>
          )}

          {/* Mixto */}
          {method === 'mixto' && (
            <>
              <div className="mb-2">
                <label className="block text-sm font-medium mb-2">Efectivo</label>
                <input
                  type="number"
                  value={amountCash}
                  onChange={(e) => setAmountCash(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tarjeta</label>
                <input
                  type="number"
                  value={amountCard}
                  onChange={(e) => setAmountCard(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
              {amountCash &&
                amountCard &&
                Number(amountCash) + Number(amountCard) !== total && (
                  <div className="text-sm text-red-600 mb-4">
                    La suma de efectivo y tarjeta debe ser igual al total
                  </div>
                )}
            </>
          )}

          {/* Factura nominativa */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={emitInvoice}
                onChange={(e) => {
                  setEmitInvoice(e.target.checked);
                  if (!e.target.checked) {
                    setClientId(undefined);
                    setSelectedClient(null);
                    setClientSearch('');
                    setClientResults([]);
                    setShowClientDropdown(false);
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Factura nominativa</span>
            </label>
          </div>

          {emitInvoice && (
            <div className="mb-4 relative">
              <label className="block text-sm font-medium mb-2">
                Cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  if (!e.target.value.trim()) {
                    setSelectedClient(null);
                    setClientId(undefined);
                  }
                }}
                onFocus={() => {
                  if (clientResults.length > 0) setShowClientDropdown(true);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Buscar cliente por nombre o ID"
              />
              {showClientDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                  {loadingClients ? (
                    <div className="p-3 text-sm text-gray-500">Buscando...</div>
                  ) : noClientsMessage ? (
                    <div className="p-3 text-sm text-gray-600">{noClientsMessage}</div>
                  ) : clientResults.length > 0 ? (
                    clientResults.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        <div className="font-medium">{client.name}</div>
                        <div className="text-gray-500 text-xs">
                          {client.identification_number}
                        </div>
                      </button>
                    ))
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 text-sm rounded">{error}</div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                isPaying ||
                isSubmitting ||
                (emitInvoice && !clientId) ||
                (method === 'efectivo' &&
                  (!amountReceived || Number(amountReceived) < total)) ||
                (method === 'mixto' &&
                  !!amountCash &&
                  !!amountCard &&
                  Number(amountCash) + Number(amountCard) !== total)
              }
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(isSubmitting || isPaying) && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting || isPaying ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
