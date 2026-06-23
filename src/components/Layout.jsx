import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Pill, FileText, History, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Medicines', href: '/medicines', icon: Pill },
    { name: 'New Bill', href: '/new-bill', icon: FileText },
    { name: 'Bill History', href: '/history', icon: History },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to log out", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-slate-950">
            <span className="text-white text-xl font-bold tracking-tight">Biotera Pharma</span>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-slate-800 p-4">
            <button
              onClick={handleLogout}
              className="flex-shrink-0 w-full group block text-slate-300 hover:text-white transition-colors flex items-center"
            >
              <LogOut className="inline-block h-5 w-5 mr-3 text-slate-400 group-hover:text-slate-300" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 w-full z-10 flex items-center justify-between h-16 px-4 bg-slate-900 sm:px-6">
        <span className="text-white text-xl font-bold">Biotera Pharma</span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-300 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-0 bg-slate-900 pt-16">
          <nav className="px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center px-2 py-3 text-base font-medium rounded-md ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-4 group flex items-center px-2 py-3 text-base font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="mr-4 flex-shrink-0 h-6 w-6" />
              Logout
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden md:pl-64 pt-16 md:pt-0">
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-slate-50">
          <div className="py-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
