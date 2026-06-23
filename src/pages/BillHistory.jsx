import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Download, Edit } from 'lucide-react';
import { getInvoices, deleteInvoice } from '../firebase/firestoreHelpers';
import { generatePDF } from '../utils/pdfGenerator';
import BillPreview from '../components/BillPreview';
import PinProtection from '../components/PinProtection';

export default function BillHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const previewRef = useRef();
  const navigate = useNavigate();

  const fetchInvoicesData = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to load invoices", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice(id);
        await fetchInvoicesData();
      } catch (error) {
        if (import.meta.env.DEV) console.error("Delete error", error);
      }
    }
  };

  const handleDownloadPDF = async (invoice) => {
    setIsGeneratingPDF(true);
    setSelectedInvoiceForPDF(invoice);
    
    // Wait for render
    setTimeout(async () => {
      try {
        await generatePDF('history-bill-preview-container', invoice.invoiceNumber);
      } catch (error) {
        if (import.meta.env.DEV) console.error("Failed to generate PDF", error);
        alert("Failed to download PDF.");
      } finally {
        setSelectedInvoiceForPDF(null);
        setIsGeneratingPDF(false);
      }
    }, 500);
  };

  const handleEdit = (invoice) => {
    navigate('/new-bill', { state: { editInvoice: invoice } });
  };

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.customer?.partyName?.toLowerCase().includes(term)
    );
  });

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <PinProtection>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Bill History</h1>
        </div>

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="mb-4">
            <input
              type="text"
              maxLength={100}
              placeholder="Search by Party Name or Invoice No."
              className="mt-1 block w-full sm:w-96 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-slate-300">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Invoice No.</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Party Name</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Grand Total</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 w-24">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{inv.invoiceNumber}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{inv.customer.partyName}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-medium">₹{inv.totals?.grandTotal?.toFixed(2)}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-3">
                      <button 
                        onClick={() => handleDownloadPDF(inv)} 
                        disabled={isGeneratingPDF}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4 inline" />
                      </button>
                      <button 
                        onClick={() => handleEdit(inv)} 
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 inline" />
                      </button>
                      <button 
                        onClick={() => handleDelete(inv.id)} 
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hidden PDF Preview Container */}
        {selectedInvoiceForPDF && (
          <div className="fixed top-[200%] left-[200%] opacity-0 pointer-events-none">
            <div id="history-bill-preview-container">
              <BillPreview ref={previewRef} invoiceData={selectedInvoiceForPDF} totals={selectedInvoiceForPDF.totals} />
            </div>
          </div>
        )}
      </div>
    </PinProtection>
  );
}
