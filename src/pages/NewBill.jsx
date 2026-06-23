import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Printer } from 'lucide-react';
import { getMedicines, generateInvoice, getBatches, peekNextInvoiceNumber, updateInvoice } from '../firebase/firestoreHelpers';
import { calculateTotals, calculateLineItemAmount } from '../utils/calculations';
import { generatePDF } from '../utils/pdfGenerator';
import BillPreview from '../components/BillPreview';

const emptyLineItem = () => ({
  productId: '', productName: '', qty: '', packSize: '', hsnCode: '',
  batch: '', exp: '', mrp: 0, rate: 0, amount: 0,
  _batches: [],       // available batches for this row
  _batchesLoaded: false,
});

export default function NewBill() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const editInvoice = location.state?.editInvoice;

  // Form State
  const [customer, setCustomer] = useState(
    editInvoice?.customer || { partyName: '', address: '', gstin: '', dlNo: '', phone: '' }
  );
  const [manualInvoiceNo, setManualInvoiceNo] = useState(editInvoice?.invoiceNumber || '');

  const [lineItems, setLineItems] = useState(
    editInvoice?.lineItems || [emptyLineItem()]
  );

  // Captured for PDF
  const [finalInvoiceData, setFinalInvoiceData] = useState(null);
  const previewRef = useRef();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [data, nextInv] = await Promise.all([
          getMedicines(),
          !editInvoice ? peekNextInvoiceNumber() : Promise.resolve(editInvoice.invoiceNumber)
        ]);
        setMedicines(data);
        if (!editInvoice) {
          setManualInvoiceNo(nextInv);
        }

        if (editInvoice) {
          // Preload batches for existing items
          const itemsWithBatches = await Promise.all(
            editInvoice.lineItems.map(async (item) => {
              if (item.productId) {
                try {
                  const batches = await getBatches(item.productId);
                  return { ...item, _batches: batches, _batchesLoaded: true };
                } catch (e) {
                  return { ...item, _batches: [], _batchesLoaded: true };
                }
              }
              return { ...item, _batches: [], _batchesLoaded: false };
            })
          );
          setLineItems(itemsWithBatches);
        }

      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load initial data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [editInvoice]);

  const handleCustomerChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setCustomer({ ...customer, [e.target.name]: value });
  };

  const addLineItem = () => {
    setLineItems([...lineItems, emptyLineItem()]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = async (index, field, value) => {
    const newItems = [...lineItems];

    if (field === 'productId') {
      const selectedMed = medicines.find(m => m.id === value);
      if (selectedMed) {
        newItems[index] = {
          ...newItems[index],
          productId: selectedMed.id,
          productName: selectedMed.productName,
          hsnCode: selectedMed.hsnCode,
          packSize: selectedMed.packSize,
          mrp: selectedMed.mrp,
          rate: selectedMed.rate,
          batch: '',
          exp: '',
          _batches: [],
          _batchesLoaded: false,
        };
        newItems[index].amount = calculateLineItemAmount(Number(newItems[index].qty || 0), selectedMed.rate);
        setLineItems([...newItems]);

        // Fetch batches for this medicine
        try {
          const batches = await getBatches(selectedMed.id);
          setLineItems(prev => {
            const updated = [...prev];
            // Auto-select if only one batch
            if (batches.length === 1) {
              const b = batches[0];
              updated[index] = {
                ...updated[index],
                _batches: batches,
                _batchesLoaded: true,
                batch: b.batchNo,
                exp: b.expiry || '',
                mrp: b.mrp || updated[index].mrp,
                rate: b.rate || updated[index].rate,
              };
              updated[index].amount = calculateLineItemAmount(Number(updated[index].qty || 0), updated[index].rate);
            } else {
              updated[index] = { ...updated[index], _batches: batches, _batchesLoaded: true };
            }
            return updated;
          });
        } catch (err) {
          if (import.meta.env.DEV) console.error('Failed to load batches', err);
          setLineItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], _batchesLoaded: true };
            return updated;
          });
        }
      } else {
        // Cleared selection
        newItems[index] = { ...emptyLineItem() };
        setLineItems([...newItems]);
      }
      return;
    }

    if (field === 'batchId') {
      // User selected a batch from dropdown
      const selectedBatch = newItems[index]._batches.find(b => b.id === value);
      if (selectedBatch) {
        newItems[index] = {
          ...newItems[index],
          batch: selectedBatch.batchNo,
          exp: selectedBatch.expiry || '',
          mrp: selectedBatch.mrp || newItems[index].mrp,
          rate: selectedBatch.rate || newItems[index].rate,
        };
        newItems[index].amount = calculateLineItemAmount(Number(newItems[index].qty || 0), newItems[index].rate);
      } else {
        // "Select batch..." cleared
        newItems[index] = {
          ...newItems[index],
          batch: '',
          exp: '',
        };
      }
      setLineItems([...newItems]);
      return;
    }

    // Generic field update
    newItems[index][field] = value;
    if (field === 'qty') {
      newItems[index].amount = calculateLineItemAmount(Number(value || 0), newItems[index].rate);
    }
    if (field === 'rate') {
      newItems[index].amount = calculateLineItemAmount(Number(newItems[index].qty || 0), Number(value || 0));
    }
    setLineItems([...newItems]);
  };

  const totals = calculateTotals(lineItems);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lineItems.some(i => !i.productId || !i.qty)) {
      alert('Please ensure all line items have a product and quantity.');
      return;
    }

    setIsGenerating(true);

    try {
      // Strip internal _batches fields before saving
      const cleanItems = lineItems.map(({ _batches, _batchesLoaded, ...rest }) => rest);

      const invoiceDataToSave = {
        customer,
        lineItems: cleanItems,
        totals,
        date: editInvoice ? editInvoice.date : new Date().toISOString()
      };

      if (editInvoice) {
        // Edit Mode
        const finalData = { ...invoiceDataToSave, invoiceNumber: manualInvoiceNo };
        await updateInvoice(editInvoice.id, finalData);
        setFinalInvoiceData({ id: editInvoice.id, ...finalData });
        
        setTimeout(async () => {
          await generatePDF('bill-preview-container', manualInvoiceNo);
          setFinalInvoiceData(null);
          setIsGenerating(false);
          alert(`Invoice ${manualInvoiceNo} updated successfully!`);
          navigate('/history');
        }, 500);
      } else {
        // Create Mode
        const newInvoice = await generateInvoice(invoiceDataToSave, manualInvoiceNo);
        setFinalInvoiceData(newInvoice);

        setTimeout(async () => {
          await generatePDF('bill-preview-container', newInvoice.invoiceNumber);
          setCustomer({ partyName: '', address: '', gstin: '', dlNo: '', phone: '' });
          setLineItems([emptyLineItem()]);
          setFinalInvoiceData(null);
          setIsGenerating(false);
          alert(`Invoice ${newInvoice.invoiceNumber} generated successfully!`);
          
          // Fetch new next invoice no
          const nextInv = await peekNextInvoiceNumber();
          setManualInvoiceNo(nextInv);
        }, 500);
      }

    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to generate bill', error);
      alert('Failed to generate bill.');
      setIsGenerating(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{editInvoice ? 'Edit Bill' : 'Generate New Bill'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow ring-1 ring-slate-900/5">

        {/* Invoice Config */}
        <div className="flex justify-end border-b pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700">Invoice No:</label>
            <input 
              type="text" 
              required
              value={manualInvoiceNo} 
              onChange={(e) => setManualInvoiceNo(e.target.value)} 
              className="w-32 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5 border uppercase font-mono"
            />
          </div>
        </div>

        {/* Customer Details */}
        <div>
          <h2 className="text-lg font-medium text-slate-900 mb-4 border-b pb-2">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Party Name</label>
              <input required type="text" maxLength={100} name="partyName" value={customer.partyName} onChange={handleCustomerChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone No.</label>
              <input type="text" name="phone" value={customer.phone} onChange={handleCustomerChange} pattern="[0-9]{10}" title="Please enter exactly 10 digits" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input required type="text" maxLength={250} name="address" value={customer.address} onChange={handleCustomerChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">GSTIN No.</label>
              <input type="text" maxLength={15} name="gstin" value={customer.gstin} onChange={handleCustomerChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">DL No.</label>
              <input type="text" maxLength={30} name="dlNo" value={customer.dlNo} onChange={handleCustomerChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border uppercase" />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h2 className="text-lg font-medium text-slate-900">Line Items</h2>
            <button type="button" onClick={addLineItem} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
              <Plus className="h-4 w-4 mr-1" /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-300">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase w-20">Qty</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase w-36">Batch</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase w-24">Exp</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase w-20">MRP</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase w-20">Rate</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase w-24">Amount</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lineItems.map((item, index) => (
                  <tr key={index}>
                    {/* Product */}
                    <td className="px-2 py-2">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleLineItemChange(index, 'productId', e.target.value)}
                        className="block w-full rounded-md border-slate-300 sm:text-sm p-1.5 border focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>{m.productName}</option>
                        ))}
                      </select>
                    </td>

                    {/* Qty */}
                    <td className="px-2 py-2">
                      <input
                        required
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleLineItemChange(index, 'qty', e.target.value)}
                        className="block w-full rounded-md border-slate-300 sm:text-sm p-1.5 border text-center"
                      />
                    </td>

                    {/* Batch Dropdown */}
                    <td className="px-2 py-2">
                      {item.productId ? (
                        item._batchesLoaded ? (
                          item._batches.length > 0 ? (
                            item._batches.length === 1 ? (
                              // Single batch — show as read-only pill
                              <div className="px-2 py-1.5 text-sm text-slate-700 bg-slate-100 rounded-md border border-slate-200 font-medium">
                                {item.batch}
                              </div>
                            ) : (
                              <select
                                value={item._batches.find(b => b.batchNo === item.batch)?.id || ''}
                                onChange={(e) => handleLineItemChange(index, 'batchId', e.target.value)}
                                className="block w-full rounded-md border-slate-300 sm:text-sm p-1.5 border focus:border-blue-500 focus:ring-blue-500"
                              >
                                <option value="">Select batch...</option>
                                {item._batches.map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.batchNo}
                                  </option>
                                ))}
                              </select>
                            )
                          ) : (
                            <input
                              type="text"
                              placeholder="No batches"
                              value={item.batch}
                              onChange={(e) => handleLineItemChange(index, 'batch', e.target.value)}
                              className="block w-full rounded-md border-slate-300 sm:text-sm p-1.5 border"
                            />
                          )
                        ) : (
                          <div className="text-xs text-slate-400 px-2 py-2 animate-pulse">Loading...</div>
                        )
                      ) : (
                        <input
                          type="text"
                          disabled
                          placeholder="—"
                          className="block w-full rounded-md border-slate-200 bg-slate-50 sm:text-sm p-1.5 border text-slate-400 cursor-not-allowed"
                        />
                      )}
                    </td>

                    {/* Exp — read-only if filled from batch, editable otherwise */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={item.exp}
                        onChange={(e) => handleLineItemChange(index, 'exp', e.target.value)}
                        className="block w-full rounded-md border-slate-300 sm:text-sm p-1.5 border"
                      />
                    </td>

                    <td className="px-2 py-2 text-right text-sm text-slate-600 bg-slate-50">{item.mrp.toFixed(2)}</td>
                    <td className="px-2 py-2 bg-slate-50">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) => handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded border border-slate-300 px-1.5 py-1 text-sm text-right focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-sm text-slate-900 bg-slate-50">{item.amount.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Box */}
        <div className="flex justify-end pt-4 border-t">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>SGST (2.5%)</span><span>₹{totals.sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>CGST (2.5%)</span><span>₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2 mt-2">
              <span>Grand Total</span><span>₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex justify-end space-x-3">
          {editInvoice && (
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isGenerating ? (editInvoice ? 'Updating...' : 'Generating...') : (
              <>
                <Printer className="-ml-1 mr-2 h-5 w-5" />
                {editInvoice ? 'Update Bill & PDF' : 'Generate Bill & PDF'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Hidden PDF Preview Container */}
      {finalInvoiceData && (
        <div className="fixed top-[200%] left-[200%] opacity-0 pointer-events-none">
          <div id="bill-preview-container">
            <BillPreview ref={previewRef} invoiceData={finalInvoiceData} totals={totals} />
          </div>
        </div>
      )}
    </div>
  );
}
