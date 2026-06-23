import { useState, useEffect } from 'react';
import { getInvoices } from '../firebase/firestoreHelpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import { subMonths, isSameMonth, parseISO } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoicesData = async () => {
      try {
        const data = await getInvoices();
        setInvoices(data);
      } catch (error) {
        if (import.meta.env.DEV) console.error("Failed to load invoices for dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoicesData();
  }, []);

  if (loading) return <div className="p-4">Loading Analytics...</div>;

  // --- Calculations ---
  
  // 1. Total Revenue (All Time)
  const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.totals?.grandTotal || 0), 0);
  
  // 2. This Month Revenue
  const now = new Date();
  const thisMonthInvoices = invoices.filter(inv => inv.date && isSameMonth(parseISO(inv.date), now));
  const thisMonthRevenue = thisMonthInvoices.reduce((acc, inv) => acc + (inv.totals?.grandTotal || 0), 0);
  
  // 3. Total Bills
  const totalBills = invoices.length;

  // --- Monthly Revenue & Bills Trend (Last 12 Months) ---
  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    last12Months.push({
      month: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      dateObj: d,
      revenue: 0,
      bills: 0
    });
  }

  invoices.forEach(inv => {
    if (!inv.date) return;
    const invDate = parseISO(inv.date);
    const monthBucket = last12Months.find(m => isSameMonth(m.dateObj, invDate));
    if (monthBucket) {
      monthBucket.revenue += (inv.totals?.grandTotal || 0);
      monthBucket.bills += 1;
    }
  });

  const chartData = last12Months.map(m => ({ name: m.month, Revenue: m.revenue, Bills: m.bills }));

  // --- Top 5 Medicines by Revenue ---
  const medicineRevenueMap = {};
  invoices.forEach(inv => {
    inv.lineItems?.forEach(item => {
      if (item.productName) {
        if (!medicineRevenueMap[item.productName]) medicineRevenueMap[item.productName] = 0;
        medicineRevenueMap[item.productName] += (item.amount || 0);
      }
    });
  });

  const topMedicines = Object.entries(medicineRevenueMap)
    .map(([name, rev]) => ({ name, value: rev }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Revenue Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-slate-500 uppercase">Total Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-slate-500 uppercase">This Month</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">₹{thisMonthRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-slate-500 uppercase">Total Bills</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalBills}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Monthly Revenue (Last 12 Months)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                <RechartsTooltip cursor={{fill: 'transparent'}} formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Medicines Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Top 5 Medicines by Revenue</h2>
          <div className="h-72">
            {topMedicines.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topMedicines}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {topMedicines.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
            )}
          </div>
        </div>
        
        {/* Bills Trend Line Chart */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Bills Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="Bills" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
