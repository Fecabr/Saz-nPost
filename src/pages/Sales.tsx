import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useCashSessionStore } from '../store/cashSessionStore';
import { OpenCashDrawerModal } from '../components/OpenCashDrawerModal';
import { CloseCashDrawerModal } from '../components/CloseCashDrawerModal';
import { PrintableTicket } from '../components/PrintableTicket';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import { formatCRC } from '../lib/currency';
import {
  ArrowLeft,
  LogOut,
  HandCoins,
  Wallet,
  X,
  Beef,
  Coffee,
  Package as PackageIcon,
  Lock,
  Unlock,
  Users,
} from 'lucide-react';
import { useRequireCompany } from '../hooks/useRequireCompany';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  type: 'batch_portion' | 'unit';
  recipeId?: string;
  stockQuantity?: number;
  lowStock?: boolean;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

const CATEGORIES = [
  { id: 'batch_portion', name: 'Platos (Baño María)', icon: Beef, color: 'from-red-500 to-red-600' },
  { id: 'drinks', name: 'Bebidas', icon: Coffee, color: 'from-blue-500 to-blue-600' },
  { id: 'others', name: 'Otros', icon: PackageIcon, color: 'from-green-500 to-green-600' },
];

export function Sales() {
  const navigate = useNavigate();
  const companyId = useRequireCompany();
  const selectedCompanyId = companyId;

  const { session, openSession, closeSession, addSale, resetSession } = useCashSessionStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<{
    companyName: string;
    date: Date;
    items: { name: string; quantity: number; price: number; total: number }[];
    total: number;
  } | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    id: string;
    date: Date;
    items: { name: string; quantity: number; price: number; total: number }[];
    total: number;
    payment: {
      method: string;
      amount_cash?: number;
      amount_card?: number;
      amount_received?: number;
      change?: number;
    };
    client?: { name: string };
    companyName: string;
  } | null>(null);

  useEffect(() => {
    if (selectedCompanyId) {
      loadProducts();
      loadCompanyName();
      loadCashSession();
    }
  }, [selectedCompanyId]);

  const loadCashSession = async () => {
    if (!selectedCompanyId) return;
    try {
      const { data: sessionData, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;

      if (sessionData) {
        let userEmail = null;
        if (sessionData.user_id) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === sessionData.user_id) {
            userEmail = user.email || null;
          }
        }

        openSession(Number(sessionData.opening_amount));

        if (userEmail) {
          const currentSession = useCashSessionStore.getState().session;
          useCashSessionStore.setState({
            session: {
              ...currentSession,
              userEmail,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error loading cash session:', error);
    }
  };

  const loadCompanyName = async () => {
    if (!selectedCompanyId) return;
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', selectedCompanyId)
        .single();

      if (error) throw error;
      setCompanyName(data.name || 'Empresa');
    } catch (error) {
      console.error('Error loading company name:', error);
    }
  };

  const loadProducts = async () => {
    if (!selectedCompanyId) return;

    setLoading(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select(`
          id,
          name,
          type,
          price,
          active
        `)
        .eq('company_id', selectedCompanyId)
        .eq('active', true)
        .in('type', ['batch_portion', 'unit', 'ingredient']);

      if (itemsError) throw itemsError;

      const { data: recipesData } = await supabase
        .from('recipes')
        .select('id, item_id')
        .eq('company_id', selectedCompanyId);

      const recipeMap = new Map((recipesData || []).map((r) => [r.item_id, r.id]));

      const items = (itemsData || []).map((item) => ({
        ...item,
        recipes: recipeMap.has(item.id) ? [{ id: recipeMap.get(item.id) }] : [],
      }));

      const productList: Product[] = await Promise.all(
        (items || []).map(async (item: any) => {
          let category = 'others';
          if (item.type === 'batch_portion') category = 'batch_portion';
          else if (item.type === 'unit') category = 'drinks';

          let stockQuantity = 0;
          let lowStock = false;

          if (item.type === 'unit' || item.type === 'ingredient') {
            const { data: stockData } = await supabase
              .from('v_item_current_stock')
              .select('qty')
              .eq('company_id', selectedCompanyId)
              .eq('item_id', item.id)
              .maybeSingle();

            stockQuantity = stockData?.qty || 0;
            lowStock = stockQuantity <= 5;
          } else if (item.type === 'batch_portion' && item.recipes?.[0]?.id) {
            const { data: batchData } = await supabase
              .from('batches')
              .select('portions_left')
              .eq('company_id', selectedCompanyId)
              .eq('recipe_id', item.recipes[0].id)
              .gt('portions_left', 0);

            stockQuantity = (batchData || []).reduce(
              (sum, b) => sum + (b.portions_left || 0),
              0
            );
            lowStock = stockQuantity <= 5;
          }

          return {
            id: item.id,
            name: item.name,
            price: parseFloat(item.price) || 0,
            category,
            type: item.type,
            recipeId: item.recipes?.[0]?.id,
            stockQuantity,
            lowStock,
          };
        })
      );

      const filteredProducts = productList.filter((p) => p.stockQuantity! > 0);
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleOpenCashDrawer = async (initialAmount: number) => {
    if (!selectedCompanyId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('cash_sessions').insert({
        company_id: selectedCompanyId,
        opening_amount: initialAmount,
        status: 'open',
      });

      if (error) throw error;

      openSession(initialAmount);

      if (user.email) {
        const currentSession = useCashSessionStore.getState().session;
        useCashSessionStore.setState({
          session: {
            ...currentSession,
            userEmail: user.email,
          },
        });
      }

      setShowOpenModal(false);
      toast.success('Caja abierta correctamente');
    } catch (error) {
      console.error('Error opening cash session:', error);
      toast.error('Error al abrir la caja');
    }
  };

  const handleCloseCashDrawer = (countedAmount: number) => {
    const difference = countedAmount - session.currentAmount;
    closeSession();
    setShowCloseModal(false);

    if (Math.abs(difference) > 0.01) {
      if (difference > 0) toast.success(`Caja cerrada. Sobrante: ${formatCRC(difference)}`);
      else toast.error(`Caja cerrada. Faltante: ${formatCRC(Math.abs(difference))}`);
    } else {
      toast.success('Caja cerrada correctamente. Sin diferencias.');
    }

    setTimeout(() => {
      resetSession();
    }, 3000);
  };

  const addToOrder = (product: Product) => {
    if (!session.isOpen) {
      toast.error('Debe abrir caja antes de vender');
      return;
    }
    const existing = order.find((i) => i.product.id === product.id);
    if (existing) {
      setOrder(
        order.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setOrder([...order, { product, quantity: 1 }]);
    }
  };

  const removeFromOrder = (productId: string) => {
    setOrder(order.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) return removeFromOrder(productId);
    setOrder(
      order.map((i) => (i.product.id === productId ? { ...i, quantity: newQuantity } : i))
    );
  };

  const calculateTotal = () =>
    order.reduce((total, i) => total + i.product.price * i.quantity, 0);

  const handleCharge = () => {
    if (!session.isOpen) {
      toast.error('Debes abrir caja para continuar.');
      return;
    }
    if (order.length === 0) {
      toast.error('El pedido está vacío');
      return;
    }
    setShowCheckoutModal(true);
  };

const handleConfirmPayment = async (
  payment: {
    method: string;
    amount_cash: number;
    amount_card: number;
    emit_invoice: boolean;
    client_id?: string;
  }
) => {
  if (!selectedCompanyId) {
    toast.error('No se ha seleccionado una empresa');
    return;
  }

  setProcessing(true);

  try {
    // 1) Payload EXACTO que espera el RPC (payment anidado)
    const payload = {
      company_id: selectedCompanyId,
      items: order.map((item) => ({
        item_id: item.product.id,
        qty: item.quantity,
        unit_price: item.product.price,
        kind: item.product.type === 'batch_portion' ? 'batch_portion' : 'unit',
        recipe_id: item.product.recipeId || null,
      })),
      payment: {
        method: payment.method,
        amount_cash: payment.amount_cash,
        amount_card: payment.amount_card,
      },
      // opcional
      notes: payment.client_id ? `client_id: ${payment.client_id}` : undefined,
      client_id: payment.client_id || null,
    };

    const { data, error } = await supabase.rpc('create_sale_v1', { payload });
    if (error) throw error;

    const total = Number(data.total || 0);
    const saleId = data.sale_id as string;

    // 2) Feedback inmediato
    toast.success('Venta registrada con éxito');
    const ticketToastId = 'ticket';
    toast.loading('Generando ticket...', { id: ticketToastId });

    // 3) Limpiar carrito y refrescar stocks
    setOrder([]);
    await loadProducts();

    // 4) Actualizar caja con lo que entra en efectivo
    addSale(payment.amount_cash || 0);

    // 5) Construir datos del recibo
    const ticketItems = order.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      total: item.product.price * item.quantity,
    }));

    const amountReceived =
      payment.method === 'efectivo' ? payment.amount_cash /* neto que entra */ : undefined;
    const change =
      payment.method === 'efectivo' && typeof amountReceived === 'number'
        ? amountReceived - total
        : undefined;

    let clientData: { name: string } | undefined;
    if (payment.client_id) {
      const { data: clientResult } = await supabase
        .from('clients')
        .select('name')
        .eq('id', payment.client_id)
        .maybeSingle();
      if (clientResult) clientData = { name: clientResult.name };
    }

    setReceiptData({
      id: saleId,
      date: new Date(),
      items: ticketItems,
      total,
      payment: {
        method: payment.method,
        amount_cash: payment.amount_cash,
        amount_card: payment.amount_card,
        amount_received: amountReceived,
        change,
      },
      client: clientData,
      companyName,
    });

    // 6) Cerrar el modal de cobro y mostrar recibo
    setShowCheckoutModal(false);
    setShowReceiptModal(true);

    // 7) (Opcional) FE
    if (payment.emit_invoice) {
      try {
        const docType = payment.client_id ? 'factura' : 'tiquete';
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fe-emit`;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No se pudo obtener el token de autenticación');

        const fePayload: any = { sale_id: saleId, doc_type: docType };
        if (payment.client_id) fePayload.client_id = payment.client_id;

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fePayload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error al emitir documento');
        }
        const feResult = await res.json();
        toast.success(
          feResult.xml_url
            ? `Documento ${feResult.status === 'aceptado' ? 'aceptado' : 'pendiente'}: ${feResult.consecutivo}`
            : `Documento emitido: ${feResult.consecutivo} - Estado: ${feResult.status}`
        );
      } catch (feErr: any) {
        console.error('Error emitting FE document:', feErr);
        toast.error(feErr?.message || 'Error al emitir documento electrónico');
      }
    }

    // 8) Refrescar cabecera de caja (por si el componente lo muestra)
    await loadCashSession();

    // 9) Quitar “Generando ticket...”
    toast.dismiss(ticketToastId);
  } catch (err: any) {
    console.error('Error processing sale:', err);
    toast.error(err?.message || 'Error al procesar la venta');
  } finally {
    setProcessing(false);
  }
};


  const handleCancel = () => {
    if (order.length === 0) {
      toast.error('No hay pedido para cancelar');
      return;
    }
    setOrder([]);
    setSelectedCategory(null);
    toast.success('Pedido cancelado');
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (selectedCategory) setSelectedCategory(null);
                  else if (selectedCompanyId) navigate('/sales');
                  else navigate('/select-company');
                }}
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
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                <Users className="w-5 h-5" />
                Clientes
              </button>
            </div>

            <h1 className="text-xl font-bold text-gray-900">Punto de Venta</h1>

            <div className="flex items-center gap-3">
              {session.isOpen ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                    <Unlock className="w-5 h-5 text-green-600" />
                    <div className="text-sm">
                      <div className="font-semibold text-green-900">Caja Abierta</div>
                      <div className="text-green-700">{formatCRC(session.currentAmount)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Cerrar Caja
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  <Lock className="w-5 h-5" />
                  Abrir Caja
                </button>
              )}

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

      <OpenCashDrawerModal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        onConfirm={handleOpenCashDrawer}
      />

      <CloseCashDrawerModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={handleCloseCashDrawer}
        session={session}
        companyName={companyName}
      />

      {showTicket && ticketData && (
        <PrintableTicket
          companyName={ticketData.companyName}
          date={ticketData.date}
          items={ticketData.items}
          total={ticketData.total}
          onClose={() => setShowTicket(false)}
        />
      )}

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        items={order.map((i) => ({ name: i.product.name, qty: i.quantity, price: i.product.price }))}
        total={calculateTotal()}
        onConfirmed={handleConfirmPayment}
        isPaying={processing}
      />

      {showReceiptModal && receiptData && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          sale={receiptData}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {!selectedCategory ? (
              <div className="grid grid-cols-2 gap-4">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`bg-gradient-to-br ${category.color} text-white rounded-xl p-8 hover:shadow-lg transition-all transform hover:scale-105`}
                    >
                      <Icon className="w-16 h-16 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold">{category.name}</h3>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                  </h2>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Volver a Categorías
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Cargando productos...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay productos registrados</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToOrder(product)}
                        disabled={!session.isOpen}
                        className={`bg-white rounded-lg p-6 shadow-md transition text-left border border-gray-200 relative ${
                          session.isOpen ? 'hover:shadow-xl cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{product.name}</h4>
                        <p className="text-2xl font-bold text-blue-600">{formatCRC(product.price)}</p>
                        {product.lowStock && (
                          <div className="mt-2">
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded">
                              {product.type === 'batch_portion' ? 'Por agotarse' : 'Stock bajo'}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 h-fit sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen del Pedido</h2>

            {order.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay productos en el pedido</p>
            ) : (
              <div className="space-y-3 mb-6">
                {order.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatCRC(item.product.price)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 transition"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 transition"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromOrder(item.product.id)}
                        className="ml-2 text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex items-center justify-between text-2xl font-bold text-gray-900">
                <span>Total:</span>
                <span className="text-blue-600">{formatCRC(calculateTotal())}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCharge}
                disabled={processing || order.length === 0 || !session.isOpen}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span className="font-bold text-xl">₡</span>
                {processing ? 'Procesando...' : 'Cobrar'}
              </button>
              <button
                onClick={handleCancel}
                disabled={processing || order.length === 0}
                className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
