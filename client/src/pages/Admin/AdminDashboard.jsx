import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { Download, Users, DollarSign, Calendar, AlertCircle, Loader2, Award } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/analytics');
      setStats(res.data.data);
    } catch (err) {
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportCSV = () => {
    // Navigate directly to the download route which attaches CSV headers
    window.open('http://localhost:5000/api/admin/reports/export', '_blank');
    toast.success('Dispatched CSV transaction download');
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
      <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl shadow-premium relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2 z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Operations Console</h1>
          <p className="text-sm text-slate-400 max-w-md">
            Review cross-platform statistics, export transactional reports, and supervise doctor approvals.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-5 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-sm hover:shadow-md transition-all z-10 flex items-center gap-2"
        >
          <Download size={16} /> Export CSV Report
        </button>
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -z-0" />
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><DollarSign size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">${stats?.totalRevenue || 0}</h4>
            <p className="text-xs text-slate-400">Total Revenue</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl"><Award size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{stats?.totalDoctors || 0}</h4>
            <p className="text-xs text-slate-400">Registered Doctors</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Users size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{stats?.totalPatients || 0}</h4>
            <p className="text-xs text-slate-400">Total Patients</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Calendar size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{stats?.todaysAppointmentsCount || 0}</h4>
            <p className="text-xs text-slate-400">Today's Consults</p>
          </div>
        </div>
      </div>

      {/* Activity Logs Panel */}
      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            System Activity Log
          </h3>
          <p className="text-xs text-slate-400 mt-1">Real-time system events, doctor registrations, and booking payments.</p>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {stats?.activityLogs?.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">No system operations logged today.</p>
          ) : (
            stats?.activityLogs?.map((log, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-3 text-xs"
              >
                <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg flex-shrink-0">
                  <AlertCircle size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-250 leading-relaxed text-left">{log.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1 text-left">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </PageWrapper>
  );
}
