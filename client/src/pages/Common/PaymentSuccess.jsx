import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Download, Calendar } from 'lucide-react';
import API, { BACKEND_URL } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointment_id');
  const sessionId = searchParams.get('session_id');
  const isMock = searchParams.get('mock') === 'true' || !sessionId;

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    const verify = async () => {
      if (!appointmentId) {
        setLoading(false);
        setSuccess(false);
        return;
      }

      try {
        const res = await API.post('/appointments/verify', {
          appointmentId,
          sessionId,
          isMock,
        });

        if (res.data.success) {
          setSuccess(true);
          setAppointment(res.data.data);
          toast.success('Payment verified successfully!');
        } else {
          setSuccess(false);
        }
      } catch (err) {
        console.error('Payment verification failed:', err);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [appointmentId, sessionId, isMock]);

  const handleDownloadInvoice = () => {
    if (appointment?.invoiceUrl) {
      window.open(`${BACKEND_URL}${appointment.invoiceUrl}`, '_blank');
    } else {
      toast.error('Invoice file not available');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-premium text-center border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in duration-300">
        {loading ? (
          <div className="flex flex-col items-center py-8">
            <Loader className="animate-spin text-primary mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Verifying Payment</h2>
            <p className="text-sm text-slate-400 mt-2">Checking with Stripe merchant ledger...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Booking Confirmed!</h2>
            <p className="text-sm text-slate-500 mt-2 px-4">
              Your appointment payment has been processed successfully. Your time slot is locked in.
            </p>

            {appointment && (
              <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 my-6 text-left border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-500">APPOINTMENT SUMMARY</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{appointment.date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time Slot:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{appointment.timeSlot}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="font-extrabold text-primary dark:text-secondary">${appointment.amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleDownloadInvoice}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={16} /> Download Invoice PDF
              </button>
              <Link
                to="/patient/appointments"
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <Calendar size={16} /> Go to Appointments
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <XCircle size={40} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Payment Verification Failed</h2>
            <p className="text-sm text-slate-500 mt-2">
              We could not authenticate this Stripe billing session. Please check with your bank or try booking again.
            </p>
            <Link
              to="/patient/appointments"
              className="mt-6 px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-750 transition-colors"
            >
              Back to Appointments
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
