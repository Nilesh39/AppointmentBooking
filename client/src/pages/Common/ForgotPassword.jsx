import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Password reset link sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-premium border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in duration-300">
        <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-primary transition-colors mb-6">
          <ArrowLeft size={14} /> Back to Log In
        </Link>

        {!submitted ? (
          <>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Forgot Password?</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              Enter your email address and we'll send you a link to reset your secure account password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader className="animate-spin" size={18} /> : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Mail size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Check Your Inbox</h2>
            <p className="text-sm text-slate-500 mt-2">
              If an account exists with <strong className="text-slate-700 dark:text-slate-300">{email}</strong>, we have dispatched a password reset link to it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
