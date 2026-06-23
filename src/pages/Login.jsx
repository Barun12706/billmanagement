import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, ShieldAlert } from 'lucide-react';

// Rate limit config
const MAX_ATTEMPTS = 5;       // Max failed attempts before lockout
const LOCKOUT_SECONDS = 30;   // Lockout duration in seconds

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const timerRef = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Countdown timer during lockout
  useEffect(() => {
    if (isLockedOut && lockoutTimer > 0) {
      timerRef.current = setInterval(() => {
        setLockoutTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsLockedOut(false);
            setFailedAttempts(0);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isLockedOut]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Block if locked out
    if (isLockedOut) return;

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Successful login — reset counters
      setFailedAttempts(0);
      navigate('/');
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        // Trigger lockout
        setIsLockedOut(true);
        setLockoutTimer(LOCKOUT_SECONDS);
        setError(`Too many failed attempts. Please wait ${LOCKOUT_SECONDS} seconds.`);
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        setError(`Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lockout.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || isLockedOut;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            Biotera Pharma
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            GST Billing Software
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${isLockedOut ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-red-50 text-red-500'}`}>
              {isLockedOut && <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{error}</span>
            </div>
          )}

          {/* Lockout countdown bar */}
          {isLockedOut && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-orange-500 font-medium">
                <span>Account temporarily locked</span>
                <span>{lockoutTimer}s remaining</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(lockoutTimer / LOCKOUT_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isDisabled}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="owner@bioterapharma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isDisabled}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Attempt indicator dots */}
          {failedAttempts > 0 && !isLockedOut && (
            <div className="flex items-center gap-1.5 justify-center">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${i < failedAttempts ? 'bg-red-500' : 'bg-slate-200'}`}
                />
              ))}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isDisabled}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : isLockedOut ? `Locked (${lockoutTimer}s)` : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
