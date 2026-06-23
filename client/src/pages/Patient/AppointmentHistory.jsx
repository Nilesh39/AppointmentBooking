import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, DollarSign, Download, Video, MessageSquare, Star, RefreshCw, XCircle, ChevronRight, AlertCircle, Loader } from 'lucide-react';
import API, { BACKEND_URL } from '../../services/api.js';
import { useSocketStore } from '../../store/socketStore.js';
import toast from 'react-hot-toast';

export default function AppointmentHistory() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket, setActiveContact } = useSocketStore();

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAppointmentId, setReviewAppointmentId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/appointments');
      setAppointments(res.data.data);
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    if (socket) {
      const handleLiveNotification = () => {
        fetchAppointments();
      };
      socket.on('new_notification', handleLiveNotification);
      return () => {
        socket.off('new_notification', handleLiveNotification);
      };
    }
  }, [socket]);

  // Custom Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelAppointmentId, setCancelAppointmentId] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancelClick = (appId) => {
    setCancelAppointmentId(appId);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await API.put(`/appointments/${cancelAppointmentId}/cancel`);
      toast.success(res.data.message || 'Appointment cancelled successfully');
      setShowCancelModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePay = async (appId) => {
    try {
      const res = await API.post(`/appointments/${appId}/checkout`);
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error('Payment checkout failed');
    }
  };

  const handleChatDirect = (doctorUser) => {
    setActiveContact(doctorUser);
    navigate('/patient/chat');
  };

  const handleOpenReview = (appId) => {
    setReviewAppointmentId(appId);
    setRating(5);
    setComment('');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    try {
      await API.post(`/appointments/${reviewAppointmentId}/review`, { rating, comment });
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleOpenReschedule = (appId) => {
    setRescheduleAppointmentId(appId);
    setNewDate('');
    setNewTimeSlot('');
    setRescheduleReason('');
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setRescheduleLoading(true);
    try {
      await API.put(`/appointments/${rescheduleAppointmentId}/reschedule-request`, {
        newDate,
        newTimeSlot,
        reason: rescheduleReason,
      });
      toast.success('Reschedule request sent to doctor');
      setShowRescheduleModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reschedule request');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleAcceptReschedule = async (appId) => {
    try {
      await API.put(`/appointments/${appId}/reschedule-accept`);
      toast.success('Rescheduled successfully!');
      fetchAppointments();
    } catch (err) {
      toast.error('Failed to accept reschedule');
    }
  };

  return (
    <PageWrapper className="space-y-6 text-left relative">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Appointment History</h2>
        <p className="text-xs text-slate-400">Track consultation status, pay invoices, and view doctor prescriptions.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-28 rounded-3xl animate-shimmer" />
          ))
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center text-slate-455">No appointment history found.</div>
        ) : (
          appointments.map((app) => (
            <div
              key={app._id}
              className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-5 hover:shadow-premium-hover transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/10 to-secondary/10 flex items-center justify-center text-2xl">
                  🩺
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-white">Dr. {app.doctorId?.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      app.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                      app.status === 'accepted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                      app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {app.status}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      app.paymentStatus === 'paid' ? 'bg-teal-150 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' : 'bg-rose-150 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                    }`}>
                      {app.paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-primary dark:text-secondary font-semibold">{app.doctorProfile?.specialization}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {app.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {app.timeSlot}</span>
                    <span className="flex items-center gap-1"><DollarSign size={12} /> ${app.amount}</span>
                  </div>

                  {/* Reschedule alerts */}
                  {app.rescheduleRequest && app.rescheduleRequest.requestedBy && (
                    <div className="mt-2 text-xs p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 flex items-center gap-2 border border-amber-100 dark:border-amber-900/50">
                      <AlertCircle size={14} />
                      <div>
                        <span>Reschedule requested to {app.rescheduleRequest.newDate} at {app.rescheduleRequest.newTimeSlot}. </span>
                        {app.rescheduleRequest.requestedBy === 'doctor' && (
                          <button
                            onClick={() => handleAcceptReschedule(app._id)}
                            className="underline font-bold text-primary dark:text-secondary ml-1"
                          >
                            Accept Reschedule
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Box */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0 justify-end">
                {app.status === 'pending' && app.paymentStatus === 'unpaid' && (
                  <>
                    <button
                      onClick={() => handlePay(app._id)}
                      className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-sm transition-colors"
                    >
                      Pay Now
                    </button>
                    <button
                      onClick={() => handleCancelClick(app._id)}
                      className="px-4 py-2 text-xs font-bold border border-red-250 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {app.status === 'accepted' && (
                  <>
                      {app.videoLink && (
                        <Link
                          to={`/video-call/${app._id}`}
                          className="px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Video size={14} /> Join Call
                        </Link>
                      )}
                    <button
                      onClick={() => handleChatDirect(app.doctorId)}
                      className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare size={14} /> Chat
                    </button>
                    <button
                      onClick={() => handleOpenReschedule(app._id)}
                      className="px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => handleCancel(app._id)}
                      className="px-3.5 py-2 text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {app.status === 'completed' && (
                  <>
                    {app.invoiceUrl && (
                      <a
                        href={`${BACKEND_URL}${app.invoiceUrl}`}
                        target="_blank"
                        className="px-3.5 py-2 text-xs font-bold border border-slate-250 dark:border-slate-800 text-slate-755 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Download size={12} /> Invoice
                      </a>
                    )}
                    {app.prescription?.pdfUrl ? (
                      <a
                        href={`${BACKEND_URL}${app.prescription.pdfUrl}`}
                        target="_blank"
                        className="px-3.5 py-2 text-xs font-bold bg-teal-500 hover:bg-teal-650 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Download size={12} /> Prescription
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 py-2">No RX PDF</span>
                    )}
                    <button
                      onClick={() => handleOpenReview(app._id)}
                      className="px-3.5 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <Star size={14} /> Rate Doctor
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal Dialog */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-premium space-y-4 border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Submit Patient Review</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Rating (1 to 5 Stars)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star size={24} fill={star <= rating ? 'currentColor' : 'transparent'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Comments</label>
                <textarea
                  required
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details of your clinical consulting experience..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {reviewLoading && <Loader className="animate-spin" size={12} />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal Dialog */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-premium space-y-4 border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Request Reschedule</h3>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">New Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">New Time Slot</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 10:00 AM or 03:00 PM"
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Rescheduling</label>
                <textarea
                  required
                  rows="2"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Work conflict, medical emergency..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {rescheduleLoading && <Loader className="animate-spin" size={12} />} Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-premium space-y-4 border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-955/20 flex items-center justify-center text-rose-500">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Cancel Appointment?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Are you sure you want to cancel this appointment? This will release the time slot and automatically initiate a refund if already paid.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl transition-colors"
              >
                No, Keep Booking
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-900/10 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? <Loader className="animate-spin" size={12} /> : 'Yes, Cancel Call'}
              </button>
            </div>
          </div>
        </div>
      )}

    </PageWrapper>
  );
}
