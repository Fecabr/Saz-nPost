import { X, Printer, Download } from 'lucide-react';
import { formatCurrencyCRC } from '../utils/currency';
import { downloadReceiptPDF, printReceiptPDF } from '../lib/printReceipt';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: {
    id: string;
    date: Date;
    items: ReceiptItem[];
    total: number;
    payment: {
      method: string;
      amount_cash?: number;
      amount_card?: number;
      amount_received?: number;
      change?: number;
    };
    client?: {
      name: string;
    };
    companyName: string;
  };
}

export default function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    printReceiptPDF({
      companyName: sale.companyName,
      date: sale.date,
      items: sale.items,
      total: sale.total,
      paymentMethod: sale.payment.method,
      amountCash: sale.payment.amount_cash,
      amountCard: sale.payment.amount_card,
      amountReceived: sale.payment.amount_received,
      change: sale.payment.change,
      clientName: sale.client?.name,
    });
  };

  const handleDownload = () => {
    downloadReceiptPDF({
      companyName: sale.companyName,
      date: sale.date,
      items: sale.items,
      total: sale.total,
      paymentMethod: sale.payment.method,
      amountCash: sale.payment.amount_cash,
      amountCard: sale.payment.amount_card,
      amountReceived: sale.payment.amount_received,
      change: sale.payment.change,
      clientName: sale.client?.name,
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'tarjeta':
        return 'Tarjeta';
      case 'mixto':
        return 'Mixto';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Tiquete de Venta</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg">{sale.companyName}</h3>
              <p className="text-sm text-gray-600">
                {sale.date.toLocaleDateString('es-CR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
                {' '}
                {sale.date.toLocaleTimeString('es-CR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-500 italic mt-1">Tiquete electrónico (demo)</p>
            </div>

            {sale.client && (
              <div className="mb-3 pb-3 border-b">
                <p className="text-sm">
                  <span className="font-medium">Cliente:</span> {sale.client.name}
                </p>
              </div>
            )}

            <div className="space-y-2 mb-3 pb-3 border-b">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.quantity} x {item.name}
                  </span>
                  <span>{formatCurrencyCRC(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold text-lg mb-3">
              <span>TOTAL:</span>
              <span>{formatCurrencyCRC(sale.total)}</span>
            </div>

            <div className="text-sm space-y-1 text-gray-700">
              <p>
                <span className="font-medium">Método de pago:</span>{' '}
                {getPaymentMethodLabel(sale.payment.method)}
              </p>

              {sale.payment.method === 'efectivo' && sale.payment.amount_received !== undefined && (
                <>
                  <p>
                    <span className="font-medium">Efectivo recibido:</span>{' '}
                    {formatCurrencyCRC(sale.payment.amount_received)}
                  </p>
                  {sale.payment.change !== undefined && sale.payment.change > 0 && (
                    <p>
                      <span className="font-medium">Vuelto:</span>{' '}
                      {formatCurrencyCRC(sale.payment.change)}
                    </p>
                  )}
                </>
              )}

              {sale.payment.method === 'mixto' && (
                <>
                  {sale.payment.amount_cash !== undefined && (
                    <p>
                      <span className="font-medium">Efectivo:</span>{' '}
                      {formatCurrencyCRC(sale.payment.amount_cash)}
                    </p>
                  )}
                  {sale.payment.amount_card !== undefined && (
                    <p>
                      <span className="font-medium">Tarjeta:</span>{' '}
                      {formatCurrencyCRC(sale.payment.amount_card)}
                    </p>
                  )}
                </>
              )}
            </div>

            <p className="text-center text-sm italic text-gray-600 mt-4">
              Gracias por su compra
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              Imprimir ticket
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
