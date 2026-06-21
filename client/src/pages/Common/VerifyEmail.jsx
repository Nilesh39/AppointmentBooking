import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import API from '../../services/api.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }

      try {
        const res = await API.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-premium text-center border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in duration-300">
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <Loader className="animate-spin text-primary mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-250">Verifying Email</h2>
            <p className="text-sm text-slate-400 mt-2">Checking validation records...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-6">
            <CheckCircle className="text-emerald-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verification Successful!</h2>
            <p className="text-sm text-slate-500 mt-2">{message}</p>
            <Link
              to="/login"
              className="mt-6 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-md transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-6">
            <XCircle className="text-red-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verification Failed</h2>
            <p className="text-sm text-slate-500 mt-2">{message}</p>
            <Link
              to="/login"
              className="mt-6 px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-750 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
