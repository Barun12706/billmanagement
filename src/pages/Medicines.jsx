import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Database } from 'lucide-react';
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, seedMedicines } from '../firebase/firestoreHelpers';
import { db } from '../firebase/config';

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    hsnCode: '',
    packSize: '',
    mrp: '',
    rate: '',
    ratePercent: '60',
  });

  const fetchMedicines = async () => {
    try {
      if (!db) {
        setLoading(false);
        return; // Mock/Empty state if Firebase isn't set up
      }
      const data = await getMedicines();
      setMedicines(data);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching medicines", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleSeed = async () => {
    try {
      if (!db) return alert("Firebase not configured");
      await seedMedicines();
      await fetchMedicines();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Seed error", error);
    }
  };

  const handleOpenModal = (med = null) => {
    if (med) {
      setCurrentMedicine(med);
      setFormData({
        productName: med.productName,
        hsnCode: med.hsnCode,
        packSize: med.packSize,
        mrp: med.mrp,
        rate: med.rate,
        ratePercent: med.ratePercent || '60',
      });
    } else {
      setCurrentMedicine(null);
      setFormData({
        productName: '',
        hsnCode: '',
        packSize: '',
        mrp: '',
        rate: '',
        ratePercent: '60',
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      try {
        await deleteMedicine(id);
        await fetchMedicines();
      } catch (error) {
        if (import.meta.env.DEV) console.error("Delete error", error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const mrp = parseFloat(formData.mrp);
    const rate = parseFloat(formData.rate);
    const medicineData = {
      productName: formData.productName,
      hsnCode: formData.hsnCode,
      packSize: formData.packSize,
      mrp: mrp,
      rate: rate,
      ratePercent: parseFloat(formData.ratePercent) || 60,
      gstRate: 5
    };

    try {
      if (currentMedicine) {
        await updateMedicine(currentMedicine.id, medicineData);
      } else {
        await addMedicine(medicineData);
      }
      setShowModal(false);
      await fetchMedicines();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Submit error", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading medicines...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Medicine Master</h1>
        <div className="mt-4 sm:mt-0 space-x-3 flex">
          {medicines.length === 0 && (
            <button
              onClick={handleSeed}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              <Database className="-ml-1 mr-2 h-5 w-5 text-slate-500" />
              Seed Initial Data
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-300">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Product Name</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">HSN Code</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Pack</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">MRP (₹)</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Rate (₹)</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {medicines.map((med) => (
              <tr key={med.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{med.productName}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{med.hsnCode}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{med.packSize}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{med.mrp.toFixed(2)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{med.rate.toFixed(2)}</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                  <button onClick={() => handleOpenModal(med)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 className="h-4 w-4 inline" />
                  </button>
                  <button onClick={() => handleDelete(med.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
            {medicines.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">
                  No medicines found. Add some or click Seed Initial Data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-slate-900">
                  {currentMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </h3>
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Product Name</label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={formData.productName}
                      onChange={e => setFormData({...formData, productName: e.target.value})}
                      className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">HSN Code</label>
                      <input
                        type="text"
                        required
                        maxLength={20}
                        value={formData.hsnCode}
                        onChange={e => setFormData({...formData, hsnCode: e.target.value})}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Pack Size</label>
                      <input
                        type="text"
                        required
                        maxLength={20}
                        placeholder="e.g. 1*10"
                        value={formData.packSize}
                        onChange={e => setFormData({...formData, packSize: e.target.value})}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">MRP (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.mrp}
                        onChange={e => {
                          const val = e.target.value;
                          const perc = parseFloat(formData.ratePercent) || 60;
                          setFormData({
                            ...formData, 
                            mrp: val, 
                            rate: val ? (parseFloat(val) * (perc / 100)).toFixed(2) : ''
                          })
                        }}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.ratePercent}
                        onChange={e => {
                          const perc = e.target.value;
                          const mrp = parseFloat(formData.mrp) || 0;
                          setFormData({
                            ...formData, 
                            ratePercent: perc, 
                            rate: mrp && perc ? (mrp * (parseFloat(perc) / 100)).toFixed(2) : ''
                          })
                        }}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.rate}
                        onChange={e => setFormData({...formData, rate: e.target.value})}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Rate is auto-calculated based on Rate % but can be overridden manually.</p>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
