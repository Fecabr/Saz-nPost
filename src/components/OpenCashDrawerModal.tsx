import { useState } from 'react';
import { Wallet, X } from 'lucide-react';

interface OpenCashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (initialAmount: number) => void;
}

export function OpenCashDrawerModal({ isOpen, onClose, onConfirm }: OpenCashDrawerModalProps) {
  const [initialAmount, setInitialAmount] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount < 0) {
      return;
    }
    onConfirm(amount);
    setInitialAmount('');
  };

  const handleClose = () => {
    setInitialAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Abrir Caja</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="initialAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Monto Inicial
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                ₡
              </span>
              <input
                id="initialAmount"
                type="number"
                step="0.01"
                min="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-lg"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Ingresa el monto con el que inicias la caja
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Abrir Caja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
