import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRequireCompany } from '../hooks/useRequireCompany';
import {
  listRecipes,
  listBatches,
  createBatch,
  registerWastage,
  type Recipe,
  type Batch,
} from '../services/inventoryService';

interface ShrinkageModalProps {
  batch: Batch;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ShrinkageModal = ({ batch, companyId, onClose, onSuccess }: ShrinkageModalProps) => {
  const [portions, setPortions] = useState(0);
  const [reason, setReason] = useState<'sobrante' | 'desecho' | 'cortesía' | 'ajuste'>('desecho');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (portions <= 0) {
      toast.error('Las porciones deben ser mayores a 0');
      return;
    }

    if (portions > batch.portions_left) {
      toast.error('No hay suficientes porciones disponibles');
      return;
    }

    setLoading(true);

    try {
      await registerWastage({
        companyId,
        sourceType: 'batch',
        sourceId: batch.id,
        qty: portions,
        reason,
      });
      toast.success('Merma registrada correctamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error registering shrinkage:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al registrar la merma'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Registrar Merma</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Porciones Disponibles
            </label>
            <input
              type="text"
              value={batch.portions_left}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Porciones a Descontar
            </label>
            <input
              type="number"
              value={portions}
              onChange={(e) => setPortions(Number(e.target.value))}
              min="1"
              max={batch.portions_left}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de la Merma
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as 'sobrante' | 'desecho' | 'cortesía' | 'ajuste')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="desecho">Desecho</option>
              <option value="sobrante">Sobrante</option>
              <option value="cortesía">Cortesía</option>
              <option value="ajuste">Ajuste</option>
            </select>
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
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar Merma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Batches = () => {
  const navigate = useNavigate();
  const selectedCompanyId = useRequireCompany();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [portions, setPortions] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [creating, setCreating] = useState(false);

  const [shrinkageModalBatch, setShrinkageModalBatch] = useState<Batch | null>(
    null
  );

  useEffect(() => {
    loadData();
  }, [selectedCompanyId]);

  const loadData = async () => {
    if (!selectedCompanyId) return;

    setLoading(true);
    try {
      const [recipesData, batchesData] = await Promise.all([
        listRecipes(selectedCompanyId),
        listBatches(selectedCompanyId),
      ]);
      setRecipes(recipesData);
      setBatches(batchesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompanyId || !selectedRecipeId) {
      toast.error('Debe seleccionar una receta');
      return;
    }

    if (portions <= 0) {
      toast.error('Las porciones deben ser mayores a 0');
      return;
    }

    setCreating(true);

    try {
      await createBatch({
        companyId: selectedCompanyId,
        recipeId: selectedRecipeId,
        portionsLeft: portions,
        expiryDate: expiryDate || undefined,
      });

      toast.success('Lote creado exitosamente');
      setSelectedRecipeId('');
      setPortions(0);
      setExpiryDate('');
      await loadData();
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al crear el lote'
      );
    } finally {
      setCreating(false);
    }
  };

  const getBatchStatus = (batch: Batch) => {
    if (batch.portions_left === 0) {
      return { text: 'Agotado', color: 'bg-gray-100 text-gray-700' };
    }

    if (!batch.expiry_date) {
      return { text: 'Activo', color: 'bg-green-100 text-green-700' };
    }

    const expiryDate = new Date(batch.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return { text: 'Vencido', color: 'bg-red-100 text-red-700' };
    } else if (daysUntilExpiry <= 3) {
      return {
        text: `Vence pronto (${daysUntilExpiry}d)`,
        color: 'bg-yellow-100 text-yellow-700',
      };
    }

    return { text: 'Activo', color: 'bg-green-100 text-green-700' };
  };

  const getRecipeName = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    return recipe?.name || 'Desconocida';
  };

  const getRowHighlight = (batch: Batch) => {
    if (batch.portions_left === 0) return '';

    if (!batch.expiry_date) return '';

    const expiryDate = new Date(batch.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return 'bg-red-50';
    } else if (daysUntilExpiry <= 3) {
      return 'bg-yellow-50';
    }

    return '';
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Gestión de Lotes</h1>
          </div>

          <form onSubmit={handleCreateBatch} className="space-y-4">
            <h2 className="text-lg font-semibold">Nuevo Lote</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receta
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Seleccione una receta</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porciones
                </label>
                <input
                  type="number"
                  value={portions || ''}
                  onChange={(e) => setPortions(Number(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento (Opcional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              disabled={creating}
            >
              {creating ? 'Creando...' : 'Crear Lote'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Lotes Existentes</h2>

          {loading ? (
            <p className="text-gray-600">Cargando lotes...</p>
          ) : batches.length === 0 ? (
            <p className="text-gray-600">No hay lotes registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Receta</th>
                    <th className="text-left py-3 px-4">Porciones Restantes</th>
                    <th className="text-left py-3 px-4">Fecha de Vencimiento</th>
                    <th className="text-left py-3 px-4">Estado</th>
                    <th className="text-left py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    const status = getBatchStatus(batch);
                    const rowHighlight = getRowHighlight(batch);

                    return (
                      <tr
                        key={batch.id}
                        className={`border-b hover:bg-gray-50 ${rowHighlight}`}
                      >
                        <td className="py-3 px-4">
                          {getRecipeName(batch.recipe_id)}
                        </td>
                        <td className="py-3 px-4">{batch.portions_left}</td>
                        <td className="py-3 px-4">
                          {batch.expiry_date
                            ? new Date(batch.expiry_date).toLocaleDateString()
                            : 'Sin fecha'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setShrinkageModalBatch(batch)}
                            disabled={batch.portions_left === 0}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Registrar Merma
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {shrinkageModalBatch && selectedCompanyId && (
        <ShrinkageModal
          batch={shrinkageModalBatch}
          companyId={selectedCompanyId}
          onClose={() => setShrinkageModalBatch(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
