import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRequireCompany } from '../hooks/useRequireCompany';
import {
  getItemsByType,
  getItemStock,
  increaseItemStock,
  decreaseItemStock,
  type Item,
} from '../services/inventoryService';

interface StockModalProps {
  item: Item;
  currentStock: number;
  mode: 'increase' | 'decrease';
  onClose: () => void;
  onSuccess: () => void;
}

const StockModal = ({
  item,
  currentStock,
  mode,
  onClose,
  onSuccess,
}: StockModalProps) => {
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedCompanyId = useRequireCompany();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompanyId) {
      toast.error('No se ha seleccionado una empresa');
      return;
    }

    if (quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (mode === 'decrease' && quantity > currentStock) {
      toast.error('No hay suficiente stock disponible');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'increase') {
        await increaseItemStock(selectedCompanyId, item.id, quantity, note);
        toast.success('Entrada registrada exitosamente');
      } else {
        await decreaseItemStock(selectedCompanyId, item.id, quantity, note);
        toast.success('Salida registrada exitosamente');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar el stock'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          {mode === 'increase' ? 'Entrada de Stock' : 'Salida de Stock'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artículo
            </label>
            <input
              type="text"
              value={item.name}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Actual
            </label>
            <input
              type="text"
              value={currentStock}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              max={mode === 'decrease' ? currentStock : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Información adicional"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                mode === 'increase'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Items = () => {
  const navigate = useNavigate();
  const selectedCompanyId = useRequireCompany();

  const [activeTab, setActiveTab] = useState<'unit' | 'ingredient'>('unit');
  const [items, setItems] = useState<Item[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [stockModal, setStockModal] = useState<{
    item: Item;
    currentStock: number;
    mode: 'increase' | 'decrease';
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCompanyId, activeTab]);

  const loadData = async () => {
    if (!selectedCompanyId) return;

    setLoading(true);
    try {
      const itemsData = await getItemsByType(selectedCompanyId, activeTab);
      setItems(itemsData);

      const stocksData: Record<string, number> = {};
      await Promise.all(
        itemsData.map(async (item) => {
          const stock = await getItemStock(selectedCompanyId, item.id);
          stocksData[item.id] = stock;
        })
      );
      setStocks(stocksData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStockModal = (
    item: Item,
    mode: 'increase' | 'decrease'
  ) => {
    setStockModal({
      item,
      currentStock: stocks[item.id] || 0,
      mode,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/sales')}
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
            <Package className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Gestión de Artículos</h1>
          </div>

          <div className="flex gap-4 border-b mb-6">
            <button
              onClick={() => setActiveTab('unit')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'unit'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bebidas y Empaquetados
            </button>
            <button
              onClick={() => setActiveTab('ingredient')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'ingredient'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Insumos
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Cargando artículos...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-600">No hay artículos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Nombre</th>
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Stock Actual</th>
                    <th className="text-left py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {item.type === 'unit'
                            ? 'Bebida/Empaquetado'
                            : 'Insumo'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            (stocks[item.id] || 0) === 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {stocks[item.id] || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleOpenStockModal(item, 'increase')
                            }
                            className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-md"
                          >
                            <Plus className="w-4 h-4" />
                            Entrada
                          </button>
                          <button
                            onClick={() =>
                              handleOpenStockModal(item, 'decrease')
                            }
                            disabled={(stocks[item.id] || 0) === 0}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent"
                          >
                            <Minus className="w-4 h-4" />
                            Salida
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {stockModal && (
        <StockModal
          item={stockModal.item}
          currentStock={stockModal.currentStock}
          mode={stockModal.mode}
          onClose={() => setStockModal(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
