import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-premium text-center border border-slate-200/50 dark:border-slate-800/50">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-2">
          Your account role is not authorized to view this resource. If you believe this is an error, please log out and sign in using a different account type.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/"
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
