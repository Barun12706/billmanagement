import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

export default function PinProtection({ children, requiredPin = '4025' }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const isAuthed = sessionStorage.getItem('pin_authenticated');
    if (isAuthed === 'true') {
      setIsAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === requiredPin) {
      sessionStorage.setItem('pin_authenticated', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  if (checking) return null;

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center space-y-6">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Lock className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Protected Area</h2>
          <p className="mt-2 text-sm text-slate-500">Please enter the security PIN to access this page.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\\D/g, ''));
                setError(false);
              }}
              className={`w-full text-center text-2xl tracking-[0.5em] font-mono rounded-md border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'} shadow-sm p-3`}
              placeholder="••••"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-600">Incorrect PIN. Please try again.</p>}
          </div>
          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
