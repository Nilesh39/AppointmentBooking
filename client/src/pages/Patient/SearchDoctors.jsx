import React, { useEffect, useState, useRef } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, MapPin, SlidersHorizontal, Loader2, Sparkles } from 'lucide-react';
import API from '../../services/api.js';
import { motion, AnimatePresence } from 'framer-motion';

const specializations = [
  'All',
  'Cardiologist',
  'Dermatologist',
  'Neurologist',
  'Orthopedic',
  'Psychiatrist',
  'Pediatrician',
  'Dentist',
  'Gynecologist',
  'ENT Specialist',
  'General Physician',
];

export default function SearchDoctors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [specialization, setSpecialization] = useState(searchParams.get('specialization') || 'All');
  const [location, setLocation] = useState('');
  const [maxFees, setMaxFees] = useState('');
  const [experience, setExperience] = useState('');

  // Results state
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Debouncing search
  const timeoutRef = useRef(null);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const specParam = specialization !== 'All' ? specialization : '';
      const res = await API.get('/patient/doctors', {
        params: {
          search,
          specialization: specParam,
          location,
          maxFees,
          experience,
        },
      });
      setDoctors(res.data.data);
    } catch (err) {
      console.error('Failed to search doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce the fetch request
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      fetchDoctors();
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [search, specialization, location, maxFees, experience]);

  return (
    <PageWrapper className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Find verified specialists <Sparkles className="text-primary animate-pulse" size={20} />
          </h1>
          <p className="text-sm text-slate-400">Search doctor profiles and secure your booking slot instantly.</p>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            showFilters
              ? 'bg-primary text-white border-transparent'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Expandable Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Location/City</label>
                <input
                  type="text"
                  placeholder="e.g. New York"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Max Fees ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={maxFees}
                  onChange={(e) => setMaxFees(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Min Experience (yrs)</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Specialty Filter</label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                >
                  {specializations.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Search Bar & Lists */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-premium border border-slate-200 dark:border-slate-800">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search className="text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Type doctor names to search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none border-none text-sm text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Doctors Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-44 rounded-3xl animate-shimmer" />
          ))
        ) : doctors.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            No doctors match your active search terms.
          </div>
        ) : (
          doctors.map((doc) => {
            // Simulate status for premium UI feel
            const isOnline = Math.random() > 0.4;
            const docInitial = doc.userId?.name ? doc.userId.name.charAt(0).toUpperCase() : 'D';

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                key={doc._id}
                className="group relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 rounded-3xl p-5 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300 flex flex-col sm:flex-row gap-5 text-left"
              >
                {/* Left: Avatar with gradient & live status dot */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex-shrink-0 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/10">
                  {docInitial}
                  <div className={`absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[7.5px] font-black uppercase tracking-wider text-white border-2 border-white dark:border-slate-950 ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>

                {/* Right: Info Area */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-850 dark:text-white truncate group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                          Dr. {doc.userId?.name}
                        </h3>
                        <p className="text-[10px] text-primary dark:text-secondary font-black uppercase tracking-wider mt-0.5">
                          {doc.specialization}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-black text-xs shrink-0 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg">
                        <Star size={11} fill="currentColor" className="shrink-0" /> 
                        {doc.averageRating ? doc.averageRating.toFixed(1) : '4.5'} 
                        <span className="text-slate-400 font-normal text-[9px]">({doc.ratingsCount || 12})</span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <p className="flex items-center gap-1 truncate"><MapPin size={12} className="text-slate-400" /> {doc.location || 'Consultation Room 3'}</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-205">Experience: <span className="font-extrabold text-primary dark:text-secondary">{doc.experience} years</span></p>
                      <p className="col-span-2 mt-1">
                        Fee: <span className="font-extrabold text-slate-850 dark:text-white text-xs">${doc.fees}</span> / slot
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <span className="text-[9.5px] font-bold text-slate-400">Available: Mon - Fri</span>
                    <button
                      onClick={() => navigate(`/doctors/${doc.userId?._id}`)}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/20 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      Book Consultation
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

    </PageWrapper>
  );
}
