import React, { useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { Clock, Plus, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MedicineReminders() {
  const { profile, addReminder, deleteReminder } = useAuthStore();
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!medicineName || !dosage || !time || selectedDays.length === 0) {
      toast.error('Please specify medicine, dosage, time, and at least one day.');
      return;
    }

    setLoading(true);
    const res = await addReminder({
      medicineName,
      dosage,
      time,
      days: selectedDays,
    });
    if (res.success) {
      setMedicineName('');
      setDosage('');
      setTime('');
      setSelectedDays([]);
    }
    setLoading(false);
  };

  return (
    <PageWrapper className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
      
      {/* Add Reminder Column */}
      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 h-fit space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            Pill Reminders <Clock className="text-primary" size={16} />
          </h3>
          <p className="text-xs text-slate-400 mt-1">Schedule daily alerts for your prescription intake.</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Medicine Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Metformin"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Dosage / Intake</label>
            <input
              type="text"
              required
              placeholder="e.g. 500mg (1 tablet)"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Reminder Time</label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Days selector */}
          <div className="space-y-2 col-span-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Frequency (Days)</label>
            <div className="flex flex-wrap gap-1.5 justify-start">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-9 h-9 flex items-center justify-center text-[10.5px] font-black rounded-full border transition-all cursor-pointer ${
                    selectedDays.includes(day)
                      ? 'bg-primary text-white border-transparent shadow-md shadow-primary/20 scale-105'
                      : 'bg-transparent border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                  title={day}
                >
                  {day.slice(0, 2)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
          >
            <Plus size={16} /> Add Alarm
          </button>
        </form>
      </div>

      {/* Alarm Schedules List Column */}
      <div className="md:col-span-2 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Active Timetables ({profile?.medicineReminders?.length || 0})</h3>
          <p className="text-xs text-slate-400 mt-1">Review and manage your daily pill configurations.</p>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {!profile?.medicineReminders || profile.medicineReminders.length === 0 ? (
            <p className="text-xs text-slate-400 py-16 text-center">No active medicine timers scheduled.</p>
          ) : (
            profile.medicineReminders.map((rem) => (
              <div
                key={rem._id}
                className="p-4 bg-slate-50/70 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{rem.medicineName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Dosage: {rem.dosage} | Time: <span className="font-bold text-slate-700 dark:text-slate-300">{rem.time}</span></p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rem.days.map((day) => (
                        <span key={day} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-bold uppercase">
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteReminder(rem._id)}
                  className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </PageWrapper>
  );
}
