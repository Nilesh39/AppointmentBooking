import React, { useEffect, useState, useMemo } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, FileText, Heart, CheckCircle, Package, Truck, Phone, CalendarRange, MapPin, X, Clipboard, Star, Navigation, Shield, Timer, Route } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import API from '../../services/api.js';

// ── ETA countdown hook ──
function useEtaCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!targetDate) { setTimeLeft(''); return; }
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Arriving now!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else setTimeLeft(`${m}m`);
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

// ── Status config ──
const STATUS_CONFIG = {
  processing: { label: 'Processing', color: 'amber', icon: '⏳', pct: 8 },
  packed: { label: 'Packed', color: 'orange', icon: '📦', pct: 20 },
  shipped: { label: 'Shipped', color: 'blue', icon: '🚀', pct: 40 },
  in_transit: { label: 'In Transit', color: 'cyan', icon: '🚛', pct: 60 },
  out_for_delivery: { label: 'Out for Delivery', color: 'indigo', icon: '🏍️', pct: 82 },
  delivered: { label: 'Delivered', color: 'emerald', icon: '✅', pct: 100 },
};

// ── Vehicle emoji ──
const vehicleEmoji = { Bike: '🏍️', Scooter: '🛵', Van: '🚐', Truck: '🚛', Car: '🚗' };

export default function PatientDashboard() {
  const { user, profile, checkAuth } = useAuthStore();
  const { socket } = useSocketStore();
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
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
    checkAuth();
    fetchDashboardData();
    if (socket) {
      const handleLiveNotification = () => {
        fetchDashboardData();
        checkAuth();
      };
      socket.on('new_notification', handleLiveNotification);
      return () => { socket.off('new_notification', handleLiveNotification); };
    }
  }, [socket]);

  const upcomingAppointments = appointments.filter(
    (app) => app.status === 'accepted' || app.status === 'pending'
  );

  // Compute current status config for selected order
  const selStatus = selectedTrackingOrder ? STATUS_CONFIG[selectedTrackingOrder.shippingStatus] || STATUS_CONFIG.processing : null;
  const etaCountdown = useEtaCountdown(selectedTrackingOrder?.estimatedDeliveryDate);

  // Delivery partner from selected order
  const dp = selectedTrackingOrder?.deliveryPartner;
  const hasPartner = dp && dp.name;

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
        <Link to="/patient/search" className="px-5 py-2.5 bg-white text-primary font-bold rounded-xl text-sm hover:shadow-md transition-all z-10">
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
            <Link to="/patient/appointments" className="text-xs text-primary dark:text-secondary font-bold hover:underline">See history</Link>
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/10 to-secondary/10 flex items-center justify-center text-lg">🩺</div>
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
            <Link to="/patient/reminders" className="text-xs text-primary dark:text-secondary font-bold hover:underline">Add new</Link>
          </div>
          <div className="space-y-2">
            {!profile?.medicineReminders || profile.medicineReminders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No reminders scheduled.</p>
            ) : (
              profile.medicineReminders.map((rem) => (
                <div key={rem._id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><CheckCircle size={16} /></div>
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

      {/* ═══════════════ Pharmacy Orders ═══════════════ */}
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
            <p className="text-xs text-slate-400 py-6 text-center col-span-2">No active pharmacy orders found.</p>
          ) : (
            orders.filter(o => o.paymentStatus === 'paid').map((ord) => {
              const sc = STATUS_CONFIG[ord.shippingStatus] || STATUS_CONFIG.processing;
              return (
              <div key={ord._id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-350">Order ID: </span>
                      <span className="font-mono text-slate-450">{ord._id.substring(18)}</span>
                    </div>
                    <span className="font-bold text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">MEDICINES</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{ord.medicines.map(m => m.name).join(', ')}</p>
                  </div>
                  {/* 6-stage progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>SHIPPING PROGRESS</span>
                      <span className="font-bold text-primary dark:text-secondary uppercase tracking-wider text-[9px] flex items-center gap-1">
                        <span>{sc.icon}</span> {sc.label}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${sc.pct}%`,
                          background: ord.shippingStatus === 'delivered'
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                        }}
                      />
                      {ord.shippingStatus !== 'delivered' && sc.pct > 10 && (
                        <div className="absolute top-0 h-full w-3 bg-white/40 rounded-full animate-pulse" style={{ left: `calc(${sc.pct}% - 8px)` }} />
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <span key={key} className={ord.shippingStatus === key ? 'text-primary dark:text-secondary scale-110' : 'opacity-60'}>
                          {cfg.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-350">₹{ord.totalAmount.toFixed(2)}</span>
                  <button
                    onClick={() => setSelectedTrackingOrder(ord)}
                    className="px-3 py-1.5 bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold rounded-lg hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Navigation size={10} /> Live Track
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          REAL-LIFE TRACKING MODAL — Premium Full-Screen Tracker
          ═══════════════════════════════════════════════════════ */}
      {selectedTrackingOrder && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden text-left flex flex-col max-h-[92vh]" style={{ animation: 'zoomIn .25s ease-out' }}>
            
            {/* ── Header with live status badge ── */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Navigation size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                    Live Tracking
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                      selStatus?.color === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      selStatus?.color === 'indigo' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
                      selStatus?.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                      selStatus?.color === 'cyan' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {selStatus?.icon} {selStatus?.label}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-mono">#{selectedTrackingOrder.trackingNumber || selectedTrackingOrder._id.substring(18)}</p>
                    {selectedTrackingOrder.currentLocation && (
                      <span className="text-[9px] text-primary dark:text-secondary font-bold flex items-center gap-0.5">
                        <MapPin size={8} /> {selectedTrackingOrder.currentLocation}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedTrackingOrder(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

              {/* ── ETA & Status Summary Strip ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 border border-primary/10 dark:border-primary/20 rounded-2xl text-center" style={{ animation: 'fadeInUp .3s ease-out' }}>
                  <Timer size={16} className="text-primary mx-auto mb-1" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ETA</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">
                    {selectedTrackingOrder.shippingStatus === 'delivered' ? '✅ Done' : (etaCountdown || '—')}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-center" style={{ animation: 'fadeInUp .4s ease-out' }}>
                  <Calendar size={16} className="text-blue-500 mx-auto mb-1" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Delivery Date</p>
                  <p className="text-[11px] font-bold text-slate-800 dark:text-white mt-0.5">
                    {selectedTrackingOrder.estimatedDeliveryDate
                      ? new Date(selectedTrackingOrder.estimatedDeliveryDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                      : 'Pending'}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-center" style={{ animation: 'fadeInUp .5s ease-out' }}>
                  <Route size={16} className="text-indigo-500 mx-auto mb-1" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Progress</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{selStatus?.pct}%</p>
                </div>
              </div>

              {/* ── Journey Route — Vertical Timeline ── */}
              {selectedTrackingOrder.journeyRoute && selectedTrackingOrder.journeyRoute.length > 0 && (() => {
                const stopIcons = { origin: '🏥', sorting: '📋', hub: '🏢', local: '📍', last_mile: '🛵', destination: '🏠' };
                const stops = selectedTrackingOrder.journeyRoute;
                const currentIdx = stops.findIndex(s => s.status === 'current');
                const totalDistance = stops.reduce((sum, s) => sum + (s.distanceFromPrevKm || 0), 0);
                const coveredDistance = stops.reduce((sum, s, i) => sum + (s.status === 'completed' || s.status === 'current' ? (s.distanceFromPrevKm || 0) : 0), 0);
                
                return (
                  <div className="space-y-2.5" style={{ animation: 'fadeInUp .4s ease-out' }}>
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Route size={11} /> Package Journey
                      </h4>
                      <span className="text-[9px] font-bold text-primary dark:text-secondary">
                        {coveredDistance}km / {totalDistance}km covered
                      </span>
                    </div>

                    <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                      {stops.map((stop, idx) => {
                        const isCompleted = stop.status === 'completed';
                        const isCurrent = stop.status === 'current';
                        const isLast = idx === stops.length - 1;
                        const arrTime = stop.actualArrival || stop.estimatedArrival;
                        
                        return (
                          <div key={idx} className="flex gap-3" style={{ animation: `fadeInUp ${0.2 + idx * 0.08}s ease-out` }}>
                            {/* Left: dot + vertical line */}
                            <div className="flex flex-col items-center" style={{ minWidth: 32 }}>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 transition-all duration-500 ${
                                isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' :
                                isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-110' :
                                'bg-slate-200 dark:bg-slate-800 text-slate-400'
                              }`} style={isCurrent ? { animation: 'pulseRing 2s infinite' } : {}}>
                                {isCompleted ? '✓' : (stopIcons[stop.stopType] || '📦')}
                              </div>
                              {!isLast && (
                                <div className="w-0.5 flex-1 my-1 relative rounded-full overflow-hidden" style={{ minHeight: 20 }}>
                                  <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800" />
                                  <div
                                    className="absolute inset-x-0 top-0 rounded-full transition-all duration-700"
                                    style={{
                                      height: isCompleted ? '100%' : (isCurrent ? '50%' : '0%'),
                                      background: 'linear-gradient(180deg, #10b981, var(--color-primary))',
                                    }}
                                  />
                                  {isCurrent && (
                                    <div className="absolute left-1/2 -translate-x-1/2 text-xs" style={{ top: '40%', animation: 'truckMove 1.5s ease-in-out infinite' }}>
                                      🚚
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Right: stop details */}
                            <div className={`flex-1 pb-4 ${isLast ? 'pb-0' : ''}`}>
                              <div className={`p-2.5 rounded-xl transition-all ${
                                isCurrent ? 'bg-primary/5 dark:bg-primary/10 border border-primary/15 dark:border-primary/20' :
                                isCompleted ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''
                              }`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className={`text-[11px] font-extrabold leading-snug ${
                                      isCurrent ? 'text-primary dark:text-secondary' :
                                      isCompleted ? 'text-emerald-700 dark:text-emerald-400' :
                                      'text-slate-500 dark:text-slate-500'
                                    }`}>
                                      {stop.stopName}
                                    </p>
                                    {isCurrent && (
                                      <span className="inline-flex items-center gap-1 text-[8px] font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded-md mt-1" style={{ animation: 'pulseRing 2s infinite' }}>
                                        <MapPin size={7} /> Package is here
                                      </span>
                                    )}
                                    {isCompleted && stop.actualArrival && (
                                      <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-0.5">
                                        ✓ Cleared
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0 ml-2">
                                    {arrTime && (
                                      <p className={`text-[9px] font-bold ${
                                        isCurrent ? 'text-primary dark:text-secondary' :
                                        isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                                        'text-slate-400'
                                      }`}>
                                        {new Date(arrTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </p>
                                    )}
                                    {arrTime && (
                                      <p className="text-[8px] text-slate-400 font-mono">
                                        {new Date(arrTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </p>
                                    )}
                                    {stop.distanceFromPrevKm > 0 && idx > 0 && (
                                      <span className="text-[8px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                        {stop.distanceFromPrevKm} km
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Delivery Partner Profile Card ── */}
              <div className="space-y-2" style={{ animation: 'fadeInUp .5s ease-out' }}>
                <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={11} /> Delivery Partner
                </h4>
                {hasPartner ? (
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        {/* Partner Avatar */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/20 relative">
                          {dp.name.charAt(0).toUpperCase()}
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center">
                            <span className="text-[6px] text-white">✓</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-extrabold text-slate-800 dark:text-white">{dp.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Rating */}
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-lg">
                              <Star size={9} className="fill-current" /> {dp.rating || '4.5'}
                            </span>
                            {/* Total deliveries */}
                            {dp.totalDeliveries > 0 && (
                              <span className="text-[9px] text-slate-400 font-bold">{dp.totalDeliveries.toLocaleString()} deliveries</span>
                            )}
                            {/* Verified badge */}
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                              <Shield size={8} /> Verified
                            </span>
                          </div>
                          {/* Vehicle info */}
                          {dp.vehicleType && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                {vehicleEmoji[dp.vehicleType] || '🚗'} {dp.vehicleType}
                              </span>
                              {dp.vehicleNumber && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{dp.vehicleNumber}</span>
                              )}
                            </div>
                          )}
                          {/* Phone number display */}
                          {dp.phone && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{dp.phone}</p>
                          )}
                        </div>
                      </div>
                      {/* Call button */}
                      {dp.phone && (
                        <a
                          href={`tel:${dp.phone}`}
                          className="flex flex-col items-center gap-1 p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-2xl transition-all cursor-pointer group"
                        >
                          <Phone size={18} className="group-hover:animate-pulse" />
                          <span className="text-[8px] font-bold uppercase tracking-wider">Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 mx-auto mb-2 flex items-center justify-center">
                      <Truck size={20} className="text-slate-300 dark:text-slate-700 animate-pulse" />
                    </div>
                    <p className="text-xs text-slate-400 font-semibold">Assigning delivery partner...</p>
                    <p className="text-[10px] text-slate-350 mt-0.5">Partner details will appear once your package is dispatched</p>
                  </div>
                )}
              </div>

              {/* ── Master Progress Bar ── */}
              <div className="space-y-2" style={{ animation: 'fadeInUp .55s ease-out' }}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Progress</span>
                  <span className="text-[10px] font-extrabold text-primary dark:text-secondary">{selStatus?.pct}% Complete</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-900 h-3.5 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: `${selStatus?.pct}%`,
                      background: selectedTrackingOrder.shippingStatus === 'delivered'
                        ? 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)'
                        : 'linear-gradient(90deg, var(--color-primary), var(--color-secondary), #818cf8)',
                      boxShadow: selectedTrackingOrder.shippingStatus === 'delivered'
                        ? '0 0 12px rgba(16,185,129,0.4)'
                        : '0 0 12px rgba(var(--color-primary-rgb, 99,102,241), 0.4)',
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-full" style={{ animation: 'shimmer 2s infinite linear', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                  </div>
                </div>
                {/* Status dot steps */}
                <div className="flex justify-between px-1 mt-1">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const statusKeys = Object.keys(STATUS_CONFIG);
                    const currentIdx = statusKeys.indexOf(selectedTrackingOrder.shippingStatus);
                    const thisIdx = statusKeys.indexOf(key);
                    const isDone = thisIdx <= currentIdx;
                    const isActive = thisIdx === currentIdx;
                    return (
                      <div key={key} className="flex flex-col items-center gap-1.5" style={{ width: '16%' }}>
                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                          isDone
                            ? (isActive ? 'bg-primary ring-4 ring-primary/20 scale-125' : 'bg-emerald-500')
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`} style={isActive ? { animation: 'pulseRing 2s infinite' } : {}} />
                        <span className={`text-[7px] font-bold text-center leading-tight ${isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Shipment Timeline ── */}
              <div className="space-y-3" style={{ animation: 'fadeInUp .6s ease-out' }}>
                <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={11} /> Shipment Timeline
                </h4>
                {selectedTrackingOrder.trackingUpdates && selectedTrackingOrder.trackingUpdates.length > 0 ? (
                  <div className="relative pl-7 space-y-4 before:absolute before:left-[12px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary/30 before:via-slate-200 before:to-slate-200 dark:before:from-primary/30 dark:before:via-slate-800 dark:before:to-slate-800">
                    {selectedTrackingOrder.trackingUpdates
                      .slice()
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .map((update, index) => {
                        const isLatest = index === 0;
                        const updateSc = STATUS_CONFIG[update.status] || STATUS_CONFIG.processing;
                        const timeDiff = Date.now() - new Date(update.timestamp).getTime();
                        const minsAgo = Math.floor(timeDiff / 60000);
                        const hoursAgo = Math.floor(timeDiff / 3600000);
                        const daysAgo = Math.floor(timeDiff / 86400000);
                        const relativeTime = daysAgo > 0 ? `${daysAgo}d ago` : hoursAgo > 0 ? `${hoursAgo}h ago` : minsAgo > 1 ? `${minsAgo}m ago` : 'Just now';

                        return (
                          <div key={update._id || index} className="relative text-xs" style={{ animation: `fadeInUp ${0.3 + index * 0.1}s ease-out` }}>
                            <div className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border-2 transition-all ${
                              isLatest
                                ? 'bg-primary border-primary ring-4 ring-primary/20'
                                : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                            }`} style={isLatest ? { animation: 'pulseRing 2s infinite' } : {}} />
                            <div className={`p-3 rounded-xl border transition-all ${
                              isLatest
                                ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/20'
                                : 'bg-transparent border-transparent'
                            }`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                                  isLatest ? 'text-primary dark:text-secondary' : 'text-slate-500'
                                }`}>
                                  {updateSc.icon} {update.status.replace(/_/g, ' ')}
                                </span>
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-400 font-mono block">
                                    {new Date(update.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })},{' '}
                                    {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                  <span className="text-[8px] text-slate-400/70 font-bold">{relativeTime}</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">{update.activity}</p>
                              {update.location && (
                                <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                                  <MapPin size={8} /> {update.location}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Package size={24} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">Timeline updates will appear here</p>
                  </div>
                )}
              </div>

            </div>

            {/* ── Footer ── */}
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-950">
              <div className="flex items-center gap-2">
                {selectedTrackingOrder.trackingNumber && (
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg">
                    TRK: {selectedTrackingOrder.trackingNumber}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedTrackingOrder(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb, 99,102,241), 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(var(--color-primary-rgb, 99,102,241), 0); }
        }
        @keyframes truckMove {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(6px); }
        }
      `}</style>
    </PageWrapper>
  );
}

