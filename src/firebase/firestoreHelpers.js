import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, runTransaction, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';

// --- Medicines ---
export const getMedicines = async () => {
  const q = query(collection(db, 'medicines'), orderBy('productName'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addMedicine = async (medicineData) => {
  return await addDoc(collection(db, 'medicines'), medicineData);
};

export const updateMedicine = async (id, medicineData) => {
  const medRef = doc(db, 'medicines', id);
  return await updateDoc(medRef, medicineData);
};

export const deleteMedicine = async (id) => {
  const medRef = doc(db, 'medicines', id);
  return await deleteDoc(medRef);
};

// --- Batches (sub-collection of medicines) ---
export const getBatches = async (medicineId) => {
  const q = query(collection(db, 'medicines', medicineId, 'batches'), orderBy('batchNo'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addBatch = async (medicineId, batchData) => {
  return await addDoc(collection(db, 'medicines', medicineId, 'batches'), batchData);
};

export const updateBatch = async (medicineId, batchId, batchData) => {
  const batchRef = doc(db, 'medicines', medicineId, 'batches', batchId);
  return await updateDoc(batchRef, batchData);
};

export const deleteBatch = async (medicineId, batchId) => {
  const batchRef = doc(db, 'medicines', medicineId, 'batches', batchId);
  return await deleteDoc(batchRef);
};

// Seed initial medicines
const initialMedicines = [
  { productName: 'BIOTERA SP', hsnCode: '30049011', packSize: '1*10', mrp: 140, rate: 84, gstRate: 5 },
  { productName: 'BIOTERA CLAV 625', hsnCode: '300410', packSize: '1*10', mrp: 195.5, rate: 117.3, gstRate: 5 },
  { productName: 'BIOFEXMORE', hsnCode: '30049011', packSize: '1*10', mrp: 180, rate: 108, gstRate: 5 },
  { productName: 'BT PANTO DSR', hsnCode: '30049011', packSize: '1*10', mrp: 150, rate: 90, gstRate: 5 },
  { productName: 'MONULUCAST LC', hsnCode: '30049011', packSize: '1*10', mrp: 130, rate: 78, gstRate: 5 },
  { productName: 'BT DOL 650', hsnCode: '30049099', packSize: '3*15', mrp: 0, rate: 0, gstRate: 5 },
  { productName: 'BT CITRA 10', hsnCode: '30049011', packSize: '10*5*10', mrp: 0, rate: 0, gstRate: 5 },
  { productName: 'BT CEF O', hsnCode: '30042099', packSize: '1*10', mrp: 0, rate: 0, gstRate: 5 },
  { productName: 'BT CALCITOS 60K', hsnCode: '30049011', packSize: '1*4', mrp: 0, rate: 0, gstRate: 5 }
];

export const seedMedicines = async () => {
  const currentMeds = await getMedicines();
  if (currentMeds.length > 0) return; // Only seed if empty
  
  for (const med of initialMedicines) {
    await addDoc(collection(db, 'medicines'), med);
  }
};

// --- Invoices ---
export const getInvoices = async () => {
  const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteInvoice = async (id) => {
  const invRef = doc(db, 'invoices', id);
  return await deleteDoc(invRef);
};

// Transaction to generate auto-incrementing invoice number and save invoice
export const generateInvoice = async (invoiceData) => {
  const counterRef = doc(db, 'counters', 'invoiceCounter');
  
  try {
    const newInvoice = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${now.getMonth() + 1}`;
      
      let newCount = 1;
      
      if (!counterDoc.exists()) {
        // Initial setup: start at 20 for this month
        newCount = 20;
        transaction.set(counterRef, { count: newCount, monthYear: currentMonthYear });
      } else {
        const data = counterDoc.data();
        if (data.monthYear !== currentMonthYear) {
          // New month started, reset to 1
          newCount = 1;
        } else {
          // Same month, increment
          newCount = data.count + 1;
        }
        transaction.update(counterRef, { count: newCount, monthYear: currentMonthYear });
      }
      
      const invoiceNumber = `R${String(newCount).padStart(6, '0')}`;
      
      // Add invoice
      const invoiceRef = doc(collection(db, 'invoices'));
      const finalInvoiceData = {
        ...invoiceData,
        invoiceNumber,
        createdAt: new Date().toISOString()
      };
      transaction.set(invoiceRef, finalInvoiceData);
      
      return finalInvoiceData;
    });
    
    return newInvoice;
  } catch (error) {
    if (import.meta.env.DEV) console.error("Error generating invoice:", error);
    throw error;
  }
};
