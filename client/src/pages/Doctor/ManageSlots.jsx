import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { Calendar, Clock, Plus, Trash2, Loader, Sparkles } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ManageSlots() {
  const { profile, checkAuth } = useAuthStore();
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  
  // New Slot Input State
  const [timeInput, setTimeInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Hydrate local schedule from profile data
  useEffect(() => {
    if (profile?.availabilitySlots) {
      // Map all weekdays to ensure we have a structure even if profile lacks it
      const schedule = weekdays.map((day) => {
        const found = profile.availabilitySlots.find((s) => s.day === day);
        return {
          day,
          slots: found ? found.slots : [],
        };
      });
      setWeeklySchedule(schedule);
    } else {
      setWeeklySchedule(weekdays.map(day => ({ day, slots: [] })));
    }
  }, [profile]);

  const activeDaySchedule = weeklySchedule.find((s) => s.day === selectedDay) || { day: selectedDay, slots: [] };

  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!timeInput) return;

    // Convert time input (24h) to 12h format (AM/PM) for display compatibility
    const [hours, minutes] = timeInput.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHours = h % 12 || 12;
    const formattedSlot = `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    // Prevent duplicates
    if (activeDaySchedule.slots.includes(formattedSlot)) {
      toast.error('This slot is already added');
      return;
    }

    const updated = weeklySchedule.map((s) => {
      if (s.day === selectedDay) {
        return {
          ...s,
          slots: [...s.slots, formattedSlot].sort((a, b) => {
            // Sort helper
            const timeA = new Date(`2026/01/01 ${a}`);
            const timeB = new Date(`2026/01/01 ${b}`);
            return timeA - timeB;
          }),
        };
      }
      return s;
    });

    setWeeklySchedule(updated);
    setTimeInput('');
  };

  const handleRemoveSlot = (slotToRemove) => {
    const updated = weeklySchedule.map((s) => {
      if (s.day === selectedDay) {
        return {
          ...s,
          slots: s.slots.filter((slot) => slot !== slotToRemove),
        };
      }
      return s;
    });
    setWeeklySchedule(updated);
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const res = await API.put('/doctor/availability', {
        availabilitySlots: weeklySchedule,
      });

      if (res.data.success) {
        toast.success('Weekly availability schedule saved!');
        checkAuth();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slots');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
      
      {/* Day Selector Panel */}
      <AnimatedItem className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 h-fit space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            Days List <Calendar className="text-primary" size={16} />
          </h3>
          <p className="text-xs text-slate-400 mt-1">Select a day of the week to configure hours.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          {weekdays.map((day) => {
            const daySlots = weeklySchedule.find((s) => s.day === day)?.slots || [];
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left flex justify-between items-center transition-all ${
                  selectedDay === day
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100/50 text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-800'
                }`}
              >
                <span>{day}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedDay === day ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  {daySlots.length} slots
                </span>
              </button>
            );
          })}
        </div>
      </AnimatedItem>

      {/* Slots Editor Panel */}
      <AnimatedItem className="md:col-span-2 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Configure {selectedDay} <Sparkles className="text-primary" size={16} />
            </h3>
            <p className="text-xs text-slate-400 mt-1">Add or remove patient consultation times for this weekday.</p>
          </div>
          
          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1 transition-all disabled:opacity-50"
          >
            {saving ? <Loader className="animate-spin" size={14} /> : 'Save Schedule'}
          </button>
        </div>

        {/* Add Slot Form */}
        <form onSubmit={handleAddSlot} className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl">
          <div className="flex-1 flex items-center gap-2 px-2">
            <Clock className="text-slate-400" size={16} />
            <input
              type="time"
              required
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="w-full bg-transparent outline-none border-none text-xs text-slate-700 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </form>

        {/* Slots List Display */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Consultation Slots</p>
          
          {activeDaySchedule.slots.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">No consulting hours set. Use form above to add slots.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
              {activeDaySchedule.slots.map((slot) => (
                <div
                  key={slot}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  <span>{slot}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slot)}
                    className="text-red-500 hover:scale-110 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedItem>

    </PageWrapper>
  );
}
