import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Star, MapPin, Award, GraduationCap, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function DoctorDetails() {
  const { id } = useParams(); // Doctor User ID
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Booking Form State
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/patient/doctors/${id}`);
        setData(res.data.data);
      } catch (err) {
        toast.error('Failed to load doctor profile');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  // Hook to parse date and update available slots
  useEffect(() => {
    if (!selectedDate || !data?.profile) {
      setAvailableSlots([]);
      return;
    }

    // Get weekday name
    const dateObj = new Date(selectedDate);
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find doctor's slots for that weekday
    const daySchedule = data.profile.availabilitySlots.find((s) => s.day === weekday);
    
    if (daySchedule) {
      setAvailableSlots(daySchedule.slots);
      setSelectedSlot(''); // Reset selection
    } else {
      setAvailableSlots([]);
      toast.error(`Dr. ${data.profile.userId?.name} does not consult on ${weekday}s`);
    }
  }, [selectedDate, data]);

  const handleBookNow = async () => {
    if (!user) {
      toast.error('Please log in to book appointments');
      navigate('/login');
      return;
    }

    if (user.role !== 'patient') {
      toast.error('Only patient accounts can book appointments');
      return;
    }

    if (!selectedDate || !selectedSlot) {
      toast.error('Please select both a date and a time slot');
      return;
    }

    setBookingLoading(true);
    try {
      // 1. Reserve slot
      const reserveRes = await API.post('/appointments/book', {
        doctorId: id,
        date: selectedDate,
        timeSlot: selectedSlot,
      });

      if (reserveRes.data.success) {
        const appointmentId = reserveRes.data.appointment._id;
        toast.loading('Redirecting to secure payment...', { id: 'booking-payment' });
        
        // 2. Initiate Stripe checkout session
        const checkoutRes = await API.post(`/appointments/${appointmentId}/checkout`);
        
        if (checkoutRes.data.success) {
          toast.dismiss('booking-payment');
          // Redirect either to Stripe Checkout or our mock payment success landing page
          window.location.href = checkoutRes.data.url;
        }
      }
    } catch (err) {
      toast.dismiss('booking-payment');
      toast.error(err.response?.data?.message || 'Booking failed. Slot might have been taken.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-slate-400">
        Doctor profile not found.
      </div>
    );
  }

  const { profile, reviews } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={16} /> Back to Search
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Doctor Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center text-5xl">
              🩺
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Dr. {profile.userId?.name}</h1>
                  <p className="text-sm text-primary dark:text-secondary font-bold uppercase mt-1">{profile.specialization}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-extrabold text-sm bg-amber-50 dark:bg-amber-950/20 px-3 py-1 rounded-full w-fit">
                  <Star size={16} fill="currentColor" /> {profile.averageRating || 'N/A'} <span>({profile.ratingsCount} reviews)</span>
                </div>
              </div>

              <div className="text-sm text-slate-400 dark:text-slate-400 space-y-1.5 pt-2">
                <p className="flex items-center gap-1.5"><MapPin size={14} /> {profile.location}</p>
                <p className="flex items-center gap-1.5"><Award size={14} /> {profile.experience} Years of Clinical Practice</p>
                <p className="flex items-center gap-1.5"><GraduationCap size={14} /> {profile.education}</p>
              </div>
            </div>
          </div>

          {/* About/Bio */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 space-y-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Professional Biography</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{profile.bio}</p>
          </div>

          {/* Reviews List */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Patient Reviews ({reviews.length})</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-400">No reviews yet for this doctor.</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev._id} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-b-0 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{rev.patientId?.name || 'Anonymous'}</span>
                      <div className="flex items-center text-amber-500 gap-0.5">
                        {Array(5).fill(0).map((_, i) => (
                          <Star key={i} size={12} fill={i < rev.rating ? 'currentColor' : 'transparent'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">"{rev.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scheduler Panel */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 space-y-6 sticky top-24">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Schedule Appointment</h3>
              <p className="text-xs text-slate-400 mt-1">Select date and available time slot.</p>
            </div>

            <div className="space-y-4">
              {/* Date Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Consultation Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <CalendarIcon size={16} />
                  </span>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Slots List */}
              {selectedDate && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Available Slots</label>
                  {availableSlots.length === 0 ? (
                    <p className="text-xs text-red-500 font-medium">No consulting hours scheduled for this day.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 border text-xs font-semibold rounded-xl text-center transition-all ${
                            selectedSlot === slot
                              ? 'bg-primary text-white border-transparent shadow-sm'
                              : 'bg-transparent border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Consultation Fees Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
                <span className="text-slate-400">Consultation Fees:</span>
                <span className="text-xl font-extrabold text-primary dark:text-secondary">${profile.fees}</span>
              </div>

              <button
                onClick={handleBookNow}
                disabled={bookingLoading || (selectedDate && availableSlots.length === 0)}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
              >
                {bookingLoading ? <Loader2 className="animate-spin" size={18} /> : 'Book Appointment'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
