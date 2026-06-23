import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages & Components
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import NewBill from './pages/NewBill';
import BillHistory from './pages/BillHistory';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="medicines" element={<Medicines />} />
            <Route path="new-bill" element={<NewBill />} />
            <Route path="history" element={<BillHistory />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
