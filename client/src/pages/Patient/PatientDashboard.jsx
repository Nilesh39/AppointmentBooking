import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, FileText, Heart, CheckCircle, Package } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import API from '../../services/api.js';

export default function PatientDashboard() {
  const { user, profile, checkAuth } = useAuthStore();
  const { socket } = useSocketStore();
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const res = await API.get('/appointments');
      setAppointments(res.data.data);
      const orderRes = await API.get('/patient/orders');
      if (orderRes.data.success) {
        setOrders(orderRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth(); // Refresh profile state
    fetchDashboardData();

    if (socket) {
      const handleLiveNotification = () => {
        fetchDashboardData();
        checkAuth();
      };
      socket.on('new_notification', handleLiveNotification);
      return () => {
        socket.off('new_notification', handleLiveNotification);
      };
    }
  }, [socket]);

  const upcomingAppointments = appointments.filter(
    (app) => app.status === 'accepted' || app.status === 'pending'
  );

  return (
    <PageWrapper className="space-y-6 text-left">
      {/* Welcome Card */}
      <div className="p-6 bg-gradient-to-r from-primary to-secondary text-white rounded-3xl shadow-premium relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2 z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome, {user?.name}!</h1>
          <p className="text-sm text-white/80 max-w-md">
            Manage your consultations, pill schedules, and health records securely from one consolidated portal.
          </p>
        </div>
        <Link
          to="/patient/search"
          className="px-5 py-2.5 bg-white text-primary font-bold rounded-xl text-sm hover:shadow-md transition-all z-10"
        >
          Book Appointment
        </Link>
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-0" />
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><Calendar size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{upcomingAppointments.length}</h4>
            <p className="text-xs text-slate-400">Upcoming Consults</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl"><Clock size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{profile?.medicineReminders?.length || 0}</h4>
            <p className="text-xs text-slate-400">Active Pill Reminders</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-accent/10 text-accent rounded-xl"><FileText size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{profile?.medicalRecords?.length || 0}</h4>
            <p className="text-xs text-slate-400">Uploaded Records</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next/Upcoming Appointments List */}
        <div className="lg:col-span-2 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white">Next Consultations</h3>
            <Link to="/patient/appointments" className="text-xs text-primary dark:text-secondary font-bold hover:underline">
              See history
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="h-20 rounded-xl animate-shimmer" />
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No consultations booked. Go ahead and find a doctor.</p>
            ) : (
              upcomingAppointments.slice(0, 3).map((app) => (
                <div key={app._id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/10 to-secondary/10 flex items-center justify-center text-lg">
                      🩺
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Dr. {app.doctorId?.name}</p>
                      <p className="text-xs text-slate-400">{app.doctorProfile?.specialization || 'Consultation'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{app.date}</p>
                    <p className="text-[10px] text-slate-400">{app.timeSlot}</p>
                    

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Medicine reminders quicklist */}
        <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white">Today's Reminders</h3>
            <Link to="/patient/reminders" className="text-xs text-primary dark:text-secondary font-bold hover:underline">
              Add new
            </Link>
          </div>

          <div className="space-y-2">
            {!profile?.medicineReminders || profile.medicineReminders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No reminders scheduled.</p>
            ) : (
              profile.medicineReminders.map((rem) => (
                <div key={rem._id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-750 dark:text-slate-250 truncate">{rem.medicineName}</p>
                    <p className="text-[10px] text-slate-400">{rem.dosage} at {rem.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pharmacy Orders Tracker */}
      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package size={18} className="text-primary" /> Active Pharmacy Orders
          </h3>
          <span className="text-xs text-slate-400 font-bold font-mono bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded">
            {orders.filter(o => o.paymentStatus === 'paid').length} Paid Order(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {orders.filter(o => o.paymentStatus === 'paid').length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center col-span-2">No active pharmacy orders found. You can purchase medications from completed consultations.</p>
          ) : (
            orders.filter(o => o.paymentStatus === 'paid').map((ord) => (
              <div key={ord._id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-350">Order ID: </span>
                    <span className="font-mono text-slate-450">{ord._id.substring(18)}</span>
                  </div>
                  <span className="font-bold text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">MEDICINES</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {ord.medicines.map(m => m.name).join(', ')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>SHIPPING PROGRESS</span>
                    <span className="font-bold text-primary dark:text-secondary uppercase tracking-wider text-[9px]">{ord.shippingStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        ord.shippingStatus === 'delivered' ? 'bg-emerald-500' :
                        ord.shippingStatus === 'out_for_delivery' ? 'bg-indigo-500' :
                        ord.shippingStatus === 'shipped' ? 'bg-blue-500' : 'bg-primary'
                      }`}
                      style={{
                        width:
                          ord.shippingStatus === 'delivered' ? '100%' :
                          ord.shippingStatus === 'out_for_delivery' ? '75%' :
                          ord.shippingStatus === 'shipped' ? '50%' : '25%'
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold font-mono">
                    <span className={ord.shippingStatus === 'processing' ? 'text-primary font-bold' : ''}>Processing</span>
                    <span className={ord.shippingStatus === 'shipped' ? 'text-blue-500 font-bold' : ''}>Shipped</span>
                    <span className={ord.shippingStatus === 'out_for_delivery' ? 'text-indigo-500 font-bold' : ''}>Out For Delivery</span>
                    <span className={ord.shippingStatus === 'delivered' ? 'text-emerald-500 font-bold' : ''}>Delivered</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
