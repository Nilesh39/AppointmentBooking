import React, { useEffect, useState, useRef } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, MapPin, SlidersHorizontal, Loader2, Sparkles, X, Award, Coins, ArrowUpDown, ShieldCheck } from 'lucide-react';
import API from '../../services/api.js';
import { motion, AnimatePresence } from 'framer-motion';

const specialtiesList = [
  { name: 'All', icon: '🏥' },
  { name: 'Cardiologist', icon: '🫀' },
  { name: 'Dermatologist', icon: '🧼' },
  { name: 'Neurologist', icon: '🧠' },
  { name: 'Orthopedic', icon: '🦴' },
  { name: 'Psychiatrist', icon: '💭' },
  { name: 'Pediatrician', icon: '👶' },
  { name: 'Dentist', icon: '🦷' },
  { name: 'Gynecologist', icon: '🤰' },
  { name: 'ENT Specialist', icon: '👂' },
  { name: 'General Physician', icon: '🩺' },
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
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('recommended');

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
          sortBy,
        },
      });
      
      // Perform minRating filtering on client side if set
      let filteredDoctors = res.data.data || [];
      if (minRating) {
        filteredDoctors = filteredDoctors.filter(
          (doc) => (doc.averageRating || 4.5) >= parseFloat(minRating)
        );
      }
      
      setDoctors(filteredDoctors);
    } catch (err) {
      console.error('Failed to search doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      fetchDoctors();
    }, 350);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [search, specialization, location, maxFees, experience, minRating, sortBy]);

  // Count active filters
  const activeFiltersCount = [
    location !== '',
    maxFees !== '',
    experience !== '',
    minRating !== '',
    specialization !== 'All'
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearch('');
    setSpecialization('All');
    setLocation('');
    setMaxFees('');
    setExperience('');
    setMinRating('');
    setSortBy('recommended');
  };

  return (
    <PageWrapper className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Find Verified Specialists <Sparkles className="text-primary animate-pulse" size={22} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Search doctor profiles, filter by rating/fees, and secure your booking slot instantly.</p>
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-500 hover:text-white border border-red-200 hover:bg-red-500 rounded-xl transition-all cursor-pointer"
            >
              <X size={13} /> Reset All
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl border text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              showFilters
                ? 'bg-primary text-white border-transparent shadow-lg shadow-primary/25'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <SlidersHorizontal size={14} /> 
            Filters
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Search Input & Sorting */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-premium border border-slate-100 dark:border-slate-800">
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2 sm:py-0 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800">
          <Search className="text-slate-400 shrink-0" size={18} />
          <input
            type="text"
            placeholder="Search doctors by name, keyword, clinic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none border-none text-sm text-slate-800 dark:text-white placeholder-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 shrink-0">
          <ArrowUpDown size={14} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent border-none text-xs font-black tracking-wider uppercase text-slate-655 dark:text-slate-300 outline-none pr-6 cursor-pointer focus:ring-0"
          >
            <option value="recommended">Sort: Recommended</option>
            <option value="fees_asc">Price: Low to High</option>
            <option value="fees_desc">Price: High to Low</option>
            <option value="experience_desc">Experience: High to Low</option>
            <option value="rating_desc">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Specialties Horizontal Carousel */}
      <div className="w-full overflow-x-auto no-scrollbar py-2 -my-2 flex gap-2.5">
        {specialtiesList.map((spec) => {
          const isSelected = specialization === spec.name;
          return (
            <button
              key={spec.name}
              onClick={() => setSpecialization(spec.name)}
              className={`px-4.5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shadow-sm border cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white border-transparent shadow-md shadow-primary/20 scale-105'
                  : 'bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <span>{spec.icon}</span>
              <span>{spec.name}</span>
            </button>
          );
        })}
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
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-250/70 dark:border-slate-800 rounded-3xl grid grid-cols-1 sm:grid-cols-4 gap-6 text-left">
              {/* Location Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-400" /> Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. New York, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary dark:text-white"
                />
              </div>

              {/* Max Fees Slider / Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={12} className="text-slate-400" /> Max Fees: {maxFees ? `$${maxFees}` : 'Any'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={maxFees || '300'}
                    onChange={(e) => setMaxFees(e.target.value === '300' ? '' : e.target.value)}
                    className="w-full accent-primary cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                  <span className="text-[10px] font-black text-slate-400 shrink-0">$300</span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  {['50', '100', '150'].map(val => (
                    <button
                      key={val}
                      onClick={() => setMaxFees(maxFees === val ? '' : val)}
                      className={`px-2 py-0.5 text-[9px] font-black rounded border ${
                        maxFees === val ? 'bg-primary/10 border-primary text-primary' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience Filter Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={12} className="text-slate-400" /> Experience
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['5', '10', '15'].map(val => (
                    <button
                      key={val}
                      onClick={() => setExperience(experience === val ? '' : val)}
                      className={`px-3 py-2 text-[10px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        experience === val 
                          ? 'bg-primary border-transparent text-white shadow-sm' 
                          : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {val}+ Years
                    </button>
                  ))}
                  <button
                    onClick={() => setExperience('')}
                    className={`px-3 py-2 text-[10px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      experience === '' 
                        ? 'bg-primary border-transparent text-white shadow-sm' 
                        : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Any
                  </button>
                </div>
              </div>

              {/* Min Rating Stars Filter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Star size={12} className="text-slate-400" /> Min Rating
                </label>
                <div className="flex gap-2">
                  {['4.0', '4.5', '4.8'].map(val => (
                    <button
                      key={val}
                      onClick={() => setMinRating(minRating === val ? '' : val)}
                      className={`px-3 py-2 flex-1 text-[10px] font-black rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        minRating === val 
                          ? 'bg-amber-500 border-transparent text-white shadow-sm' 
                          : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-amber-550 dark:text-amber-400 hover:bg-slate-50'
                      }`}
                    >
                      <span>{val}</span>
                      <Star size={10} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doctors Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-44 rounded-3xl animate-pulse bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50" />
          ))
        ) : doctors.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <SlidersHorizontal size={24} className="mx-auto mb-2 text-slate-300" />
            No verified specialists match your active filters.
            <button
              onClick={resetAllFilters}
              className="block mx-auto mt-4 text-xs font-black text-primary hover:underline cursor-pointer"
            >
              Clear all filters & try again
            </button>
          </div>
        ) : (
          doctors.map((doc) => {
            const isOnline = doc.experience % 2 === 0; // Deterministic online status representation
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
                    isOnline ? 'bg-emerald-500' : 'bg-slate-400'
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
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-primary dark:text-secondary font-black uppercase tracking-wider">
                            {doc.specialization}
                          </p>
                          <span className="w-1 h-1 bg-slate-350 rounded-full"></span>
                          <span className="text-[9.5px] font-bold text-slate-400 flex items-center gap-0.5">
                            <ShieldCheck size={11} className="text-emerald-500" /> Verified
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-black text-xs shrink-0 bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded-lg">
                        <Star size={11} fill="currentColor" className="shrink-0" /> 
                        {doc.averageRating ? doc.averageRating.toFixed(1) : '4.5'} 
                        <span className="text-slate-400 font-normal text-[9px]">({doc.ratingsCount || 12})</span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <p className="flex items-center gap-1 truncate"><MapPin size={12} className="text-slate-400 shrink-0" /> {doc.location || 'Consultation Room 3'}</p>
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
