import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader, ArrowRight, Activity } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

export default function Login() {
  const [role, setRole] = useState('patient'); // patient, doctor, admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    const res = await login(email, password, role);
    if (res.success) {
      navigate(`/${role}/dashboard`);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-premium border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in duration-300">
        
        {/* Branding header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary items-center justify-center text-white font-bold shadow-md mx-auto">
            <span>M</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Log In</h2>
          <p className="text-xs text-slate-400">Welcome back to your healthcare workspace.</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl mb-6">
          {['patient', 'doctor', 'admin'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl capitalize transition-all ${
                role === r
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-primary dark:text-secondary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Footer Link */}
        {role !== 'admin' && (
          <p className="text-center text-xs text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-primary dark:text-secondary hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
