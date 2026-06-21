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
          doctors.map((doc) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              key={doc._id}
              className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-5 hover:shadow-premium-hover flex flex-col sm:flex-row gap-5 transition-all text-left"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary/25 to-secondary/25 flex-shrink-0 flex items-center justify-center text-3xl">
                🩺
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-white truncate">Dr. {doc.userId?.name}</h3>
                      <p className="text-xs text-primary dark:text-secondary font-bold uppercase mt-0.5">{doc.specialization}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs">
                      <Star size={14} fill="currentColor" /> {doc.averageRating || 'N/A'} <span className="text-slate-400 font-normal">({doc.ratingsCount})</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <p className="flex items-center gap-1 truncate"><MapPin size={12} /> {doc.location}</p>
                    <p>Consultation Fee: <span className="font-extrabold text-slate-800 dark:text-white">${doc.fees}</span></p>
                    <p>Experience: <span className="font-bold text-slate-650 dark:text-slate-300">{doc.experience} years</span></p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/doctors/${doc.userId?._id}`)}
                  className="mt-4 sm:mt-0 w-full sm:w-fit px-5 py-2 text-center text-xs font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-md"
                >
                  Book Consultation
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

    </PageWrapper>
  );
}
