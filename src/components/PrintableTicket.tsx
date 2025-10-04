import { Printer } from 'lucide-react';
import { formatCRC } from '../lib/currency';

interface TicketItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface PrintableTicketProps {
  companyName: string;
  date: Date;
  items: TicketItem[];
  total: number;
  onClose: () => void;
}

export const PrintableTicket = ({
  companyName,
  date,
  items,
  total,
  onClose,
}: PrintableTicketProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 print:p-0">
          <div className="mb-4 print:hidden flex justify-between items-center">
            <h2 className="text-xl font-semibold">Ticket de Venta</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div id="ticket" className="bg-white p-6 print:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">{companyName}</h1>
              <p className="text-sm text-gray-600">
                {date.toLocaleDateString('es-CR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600">
                {date.toLocaleTimeString('es-CR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="border-t border-b border-gray-300 py-4 mb-4">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-semibold">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center">Cant.</th>
                    <th className="pb-2 text-right">Precio</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="text-sm">
                      <td className="py-1">{item.name}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">
                        {formatCRC(item.price)}
                      </td>
                      <td className="py-1 text-right">
                        {formatCRC(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-bold">TOTAL:</span>
              <span className="text-2xl font-bold">{formatCRC(total)}</span>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>¡Gracias por su compra!</p>
            </div>
          </div>

          <div className="mt-6 print:hidden flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ticket,
          #ticket * {
            visibility: visible;
          }
          #ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
