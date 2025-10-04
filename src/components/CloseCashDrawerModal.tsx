import { useState } from 'react';
import { Calculator, X, Wallet, TrendingUp, Clock, Printer, Download } from 'lucide-react';
import { CashSession } from '../store/cashSessionStore';
import { formatCRC } from '../lib/currency';
import { downloadCashAuditPDF, printCashAuditPDF } from '../lib/printCashAudit';

interface CloseCashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (countedAmount: number) => void;
  session: CashSession;
  companyName: string;
}

export function CloseCashDrawerModal({ isOpen, onClose, onConfirm, session, companyName }: CloseCashDrawerModalProps) {
  const [countedAmount, setCountedAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [auditData, setAuditData] = useState<{
    countedAmount: number;
    difference: number;
    closedAt: Date;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(countedAmount);
    if (isNaN(amount) || amount < 0) {
      return;
    }
    const diff = amount - session.currentAmount;
    setAuditData({
      countedAmount: amount,
      difference: diff,
      closedAt: new Date(),
    });
    setShowSuccess(true);
    onConfirm(amount);
  };

  const handleClose = () => {
    setCountedAmount('');
    setShowSuccess(false);
    setAuditData(null);
    onClose();
  };

  const handlePrintAudit = () => {
    if (!auditData) return;
    printCashAuditPDF({
      companyName,
      cashierName: session.userEmail || 'Desconocido',
      openedAt: session.openedAt ? new Date(session.openedAt) : new Date(),
      closedAt: auditData.closedAt,
      initialAmount: session.initialAmount,
      salesAmount: session.currentAmount - session.initialAmount,
      salesCount: session.sales,
      manualMovements: 0,
      expectedAmount: session.currentAmount,
      countedAmount: auditData.countedAmount,
      difference: auditData.difference,
    });
  };

  const handleDownloadAudit = () => {
    if (!auditData) return;
    downloadCashAuditPDF({
      companyName,
      cashierName: session.userEmail || 'Desconocido',
      openedAt: session.openedAt ? new Date(session.openedAt) : new Date(),
      closedAt: auditData.closedAt,
      initialAmount: session.initialAmount,
      salesAmount: session.currentAmount - session.initialAmount,
      salesCount: session.sales,
      manualMovements: 0,
      expectedAmount: session.currentAmount,
      countedAmount: auditData.countedAmount,
      difference: auditData.difference,
    });
  };

  const counted = parseFloat(countedAmount) || 0;
  const difference = counted - session.currentAmount;
  const hasDifference = Math.abs(difference) > 0.01;

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 my-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Arqueo de Caja</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {session.userEmail && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Caja abierta por:</span> {session.userEmail}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Apertura</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{formatTime(session.openedAt)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">Monto Inicial</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {formatCRC(session.initialAmount)}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Ventas ({session.sales})</span>
              </div>
              <p className="text-lg font-semibold text-green-700">
                {formatCRC(session.currentAmount - session.initialAmount)}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Calculator className="w-4 h-4" />
                <span className="text-sm font-medium">Total Esperado</span>
              </div>
              <p className="text-lg font-semibold text-blue-700">
                {formatCRC(session.currentAmount)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="countedAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Monto Contado en Caja
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  ₡
                </span>
                <input
                  id="countedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {countedAmount && hasDifference && (
              <div
                className={`p-4 rounded-lg ${
                  difference > 0
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {difference > 0 ? 'Sobrante' : 'Faltante'}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    difference > 0 ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {formatCRC(Math.abs(difference))}
                </p>
              </div>
            )}

            {!showSuccess ? (
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Cerrar Caja
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-semibold text-center">¡Caja cerrada exitosamente!</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrintAudit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir arqueo
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAudit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cerrar
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
