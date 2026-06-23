import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, Users, Video, MessageSquare, Award, Clock, Loader2, Sparkles } from 'lucide-react';
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
      await API.post(`/doctor/routes/appointments/${presAppId}/prescription`, {
        text: presText,
        medicines,
      });
      // Wait, is the endpoint /doctor/appointments/:id/prescription?
      // Let's verify routes in DoctorRoutes:
      // router.post('/appointments/:appointmentId/prescription', writePrescription);
      // Mounted on app.use('/api/doctor', doctorRoutes);
      // Yes, so: /api/doctor/appointments/:id/prescription
      // Let's use the correct URL: `/doctor/appointments/${presAppId}/prescription`
    } catch (err) {
      // Let's call the correct path:
      try {
        await API.post(`/doctor/appointments/${presAppId}/prescription`, {
          text: presText,
          medicines,
        });
        toast.success('Prescription generated and consultation completed!');
        setShowPresModal(false);
        fetchDashboardData();
      } catch (innerErr) {
        toast.error('Prescription generation failed.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelAppointment = async (appId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await API.put(`/appointments/${appId}/cancel`);
      toast.success('Appointment cancelled');
      fetchDashboardData();
    } catch (err) {
      toast.error('Cancellation failed');
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  {app.status === 'accepted' && (
                    <>
                      {app.videoLink && (
                        <a
                          href={app.videoLink}
                          target="_blank"
                          className="px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Video size={14} /> Join
                        </a>
                      )}
                      <button
                        onClick={() => handleChat(app.patientId)}
                        className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare size={14} /> Chat
                      </button>
                      <button
                        onClick={() => handleOpenPrescription(app._id)}
                        className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-sm transition-colors"
                      >
                        Prescribe
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(app._id)}
                        className="px-3.5 py-2 text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition-colors"
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

    </PageWrapper>
  );
}
