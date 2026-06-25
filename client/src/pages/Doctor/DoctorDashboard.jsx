import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, DollarSign, Users, MessageSquare, Award, Clock, Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const { socket, setActiveContact } = useSocketStore();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'all'

  // Prescription Modal State
  const [showPresModal, setShowPresModal] = useState(false);
  const [presAppId, setPresAppId] = useState('');
  const [presText, setPresText] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medFreq, setMedFreq] = useState('');
  const [medDur, setMedDur] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/doctor/analytics');
      setAnalytics(res.data.analytics);
    } catch (err) {
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    const raw = analytics?.monthlyRevenue || [];
    if (raw.length < 3) {
      return [
        { label: 'Jan', revenue: 450, appointments: 3 },
        { label: 'Feb', revenue: 750, appointments: 5 },
        { label: 'Mar', revenue: 900, appointments: 6 },
        { label: 'Apr', revenue: 1200, appointments: 8 },
        { label: 'May', revenue: 1600, appointments: 10 },
        { label: 'Jun', revenue: analytics?.totalRevenue || 1900, appointments: analytics?.completedAppointmentsCount || 12 }
      ];
    }
    return raw.map(item => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(item._id.split('-')[1]) - 1;
      return {
        label: months[monthIndex] || item._id,
        revenue: item.revenue,
        appointments: item.appointments
      };
    });
  };

  const renderRevenueChart = () => {
    const data = getChartData();
    const width = 500;
    const height = 180;
    const padding = 35;
    const maxRev = Math.max(...data.map(d => d.revenue), 100) * 1.15;

    const points = data.map((d, i) => {
      const x = padding + (i * (width - 2 * padding)) / (data.length - 1);
      const y = height - padding - (d.revenue * (height - 2 * padding)) / maxRev;
      return { x, y, label: d.label, val: d.revenue };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
      : '';

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider">Revenue Trend (USD)</h4>
        <div className="relative bg-slate-50/50 dark:bg-slate-900/10 p-4 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding + ratio * (height - 2 * padding);
              const val = Math.round(maxRev - ratio * maxRev);
              return (
                <g key={idx} className="opacity-20 dark:opacity-10">
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeDasharray="3 3" />
                  <text x={padding - 5} y={y + 3} textAnchor="end" className="fill-slate-500 text-[8px] font-bold">${val}</text>
                </g>
              );
            })}
            
            {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}
            {linePath && <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />}
            
            {points.map((p, idx) => (
              <g key={idx} className="group">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#06b6d4"
                  className="stroke-white dark:stroke-slate-950 stroke-2 hover:r-6 transition-all duration-200 cursor-pointer"
                />
                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect x={p.x - 25} y={p.y - 26} width="50" height="18" rx="4" fill="#0f172a" className="stroke-slate-800 stroke" />
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fill="#fff" className="text-[8px] font-bold">${Math.round(p.val)}</text>
                </g>
                <text x={p.x} y={height - 10} textAnchor="middle" className="fill-slate-400 text-[8px] font-bold">{p.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const renderSlotsChart = () => {
    const raw = analytics?.popularSlots || [];
    const data = raw.length > 0 ? raw : [
      { _id: '09:00 AM', count: 5 },
      { _id: '11:00 AM', count: 8 },
      { _id: '01:30 PM', count: 4 },
      { _id: '03:00 PM', count: 6 },
      { _id: '05:00 PM', count: 3 }
    ];

    const width = 500;
    const height = 180;
    const padding = 30;
    const maxCount = Math.max(...data.map(d => d.count), 2) * 1.15;
    
    const barWidth = 35;
    const spacing = (width - 2 * padding) / data.length;

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Popular Consultation Hours</h4>
        <div className="relative bg-slate-50/50 dark:bg-slate-900/10 p-4 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {[0, 0.5, 1].map((ratio, idx) => {
              const y = padding + ratio * (height - 2 * padding);
              const val = Math.round(maxCount - ratio * maxCount);
              return (
                <g key={idx} className="opacity-20 dark:opacity-10">
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeDasharray="3 3" />
                  <text x={padding - 5} y={y + 3} textAnchor="end" className="fill-slate-500 text-[8px] font-bold">{val}</text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const x = padding + i * spacing + (spacing - barWidth) / 2;
              const barHeight = (d.count * (height - 2 * padding)) / maxCount;
              const y = height - padding - barHeight;

              return (
                <g key={i} className="group">
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    fill="#10b981"
                    className="hover:opacity-85 transition-opacity duration-200 cursor-pointer"
                  />
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <rect x={x + barWidth/2 - 25} y={y - 24} width="50" height="18" rx="4" fill="#0f172a" className="stroke-slate-800 stroke" />
                    <text x={x + barWidth/2} y={y - 12} textAnchor="middle" fill="#fff" className="text-[8px] font-bold">{d.count} Bookings</text>
                  </g>
                  <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="fill-slate-400 text-[8px] font-bold">{d._id}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
      const handleLiveNotification = () => {
        fetchDashboardData();
      };
      socket.on('new_notification', handleLiveNotification);
      return () => {
        socket.off('new_notification', handleLiveNotification);
      };
    }
  }, [socket]);

  const handleAddMedicine = () => {
    if (!medName || !medDose || !medFreq || !medDur) {
      toast.error('Please fill all medicine fields');
      return;
    }
    setMedicines([...medicines, { name: medName, dosage: medDose, frequency: medFreq, duration: medDur }]);
    setMedName('');
    setMedDose('');
    setMedFreq('');
    setMedDur('');
  };

  const handleRemoveMedicine = (idx) => {
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleOpenPrescription = (appId) => {
    setPresAppId(appId);
    setPresText('');
    setMedicines([]);
    setShowPresModal(true);
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!presText && medicines.length === 0) {
      toast.error('Please write some directions or add medicines');
      return;
    }

    setSubmitLoading(true);
    try {
      await API.post(`/doctor/appointments/${presAppId}/prescription`, {
        text: presText,
        medicines,
      });
      toast.success('Prescription generated and consultation completed!');
      setShowPresModal(false);
      fetchDashboardData();
    } catch (err) {
      toast.error('Prescription generation failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

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
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleChat = (patientUser) => {
    setActiveContact(patientUser);
    navigate('/doctor/chat');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-6 text-left relative">
      
      {/* Welcome Card */}
      <div className="p-6 bg-gradient-to-r from-primary to-secondary text-white rounded-3xl shadow-premium relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2 z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome, Dr. {user?.name}!</h1>
          <p className="text-sm text-white/80 max-w-md">
            Review your patient diagnostics queue, update weekly hours, and track earnings metrics from your workspace.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-0" />
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><DollarSign size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">${analytics?.totalRevenue || 0}</h4>
            <p className="text-xs text-slate-400">Total Earnings</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl"><Users size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{analytics?.uniquePatientsCount || 0}</h4>
            <p className="text-xs text-slate-400">Unique Patients</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Calendar size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{analytics?.completedAppointmentsCount || 0}</h4>
            <p className="text-xs text-slate-400">Completed Slots</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Clock size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{analytics?.pendingAppointmentsCount || 0}</h4>
            <p className="text-xs text-slate-400">Pending Slots</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-505/10 text-indigo-500 rounded-xl"><Sparkles size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{analytics?.patientRetentionRate || 0}%</h4>
            <p className="text-xs text-slate-400">Retention Rate</p>
          </div>
        </div>
      </div>

      {/* SVG Charts Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRevenueChart()}
        {renderSlotsChart()}
      </div>

      {/* Main Queue Feed */}
      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Consultations Queue <Sparkles className="text-primary" size={16} />
            </h3>
            <p className="text-xs text-slate-400 mt-1">Review scheduled appointments and write medical scripts.</p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              Today ({analytics?.todaysAppointments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              All ({analytics?.allAppointments?.length || 0})
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {((activeTab === 'today' ? analytics?.todaysAppointments : analytics?.allAppointments) || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center font-bold">
              No appointments found for {activeTab === 'today' ? "today" : "this schedule"}.
            </p>
          ) : (
            ((activeTab === 'today' ? analytics?.todaysAppointments : analytics?.allAppointments) || []).map((app) => (
              <div
                key={app._id}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {app.patientId?.name ? app.patientId.name.charAt(0) : 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-white">{app.patientId?.name || 'Unknown Patient'}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        app.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        app.status === 'accepted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                        app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Date: {app.date} | Time: {app.timeSlot} | Fee: ${app.amount}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end mt-4 sm:mt-0">
                  {app.status === 'accepted' && (
                    <>

                      <button
                        onClick={() => handleChat(app.patientId)}
                        className="flex-1 min-w-[calc(50%-4px)] sm:flex-none px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center gap-1 transition-colors"
                      >
                        <MessageSquare size={14} /> Chat
                      </button>
                      <button
                        onClick={() => handleOpenPrescription(app._id)}
                        className="flex-1 min-w-[calc(50%-4px)] sm:flex-none px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl flex items-center justify-center gap-1 shadow-sm transition-colors"
                      >
                        Prescribe
                      </button>
                      <button
                        onClick={() => handleCancelClick(app._id)}
                        className="flex-1 min-w-[calc(50%-4px)] sm:flex-none px-3.5 py-2 text-xs font-bold border border-red-250 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl flex items-center justify-center gap-1 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {app.status === 'completed' && (
                    <span className="text-xs text-emerald-500 font-bold py-2">Consultation Completed</span>
                  )}
                  {app.status === 'cancelled' && (
                    <span className="text-xs text-red-500 font-bold py-2">Consultation Cancelled</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Prescription Modal Writer */}
      {showPresModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-premium space-y-4 border border-slate-100 dark:border-slate-800 text-left max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Write Patient Prescription</h3>
            
            <form onSubmit={handlePrescriptionSubmit} className="space-y-4">
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Directions / Advice</label>
                <textarea
                  required
                  rows="3"
                  value={presText}
                  onChange={(e) => setPresText(e.target.value)}
                  placeholder="Clinical assessment directions (e.g. avoid heavy foods, bedrest, review in 7 days)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm resize-none"
                />
              </div>

              {/* Medicines Adder Form */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                <p className="text-xs uppercase font-bold tracking-wider text-primary dark:text-secondary">Medications Planner</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Medicine Name"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 500mg)"
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Frequency (e.g. 1-0-1)"
                    value={medFreq}
                    onChange={(e) => setMedFreq(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 5 days)"
                    value={medDur}
                    onChange={(e) => setMedDur(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition-colors"
                >
                  Add Medicine
                </button>
              </div>

              {/* Medicines Preview list */}
              {medicines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prescribed Medicines</p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {medicines.map((med, index) => (
                      <div key={index} className="flex justify-between items-center py-2 text-xs">
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{med.name} - {med.dosage} ({med.frequency} for {med.duration})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(index)}
                          className="text-red-500 underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPresModal(false)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {submitLoading && <Loader2 className="animate-spin" size={12} />} Finalize & Complete Consult
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
              <Clock size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Cancel Consultation?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Are you sure you want to cancel this appointment? This will release the slot and automatically trigger a refund of fees back to the patient.
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
                {cancelLoading ? <Loader2 className="animate-spin" size={12} /> : 'Yes, Cancel Call'}
              </button>
            </div>
          </div>
        </div>
      )}

    </PageWrapper>
  );
}
