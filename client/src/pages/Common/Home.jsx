import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Heart, Star, Award, Shield, ArrowRight, ArrowDownRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import API from '../../services/api.js';

const specializationsList = [
  { name: 'Cardiologist', icon: '❤️', desc: 'Heart Health' },
  { name: 'Dermatologist', icon: '☀️', desc: 'Skin Care' },
  { name: 'Neurologist', icon: '🧠', desc: 'Brain & Nerves' },
  { name: 'Orthopedic', icon: '🦴', desc: 'Bone & Joints' },
  { name: 'Psychiatrist', icon: '💭', desc: 'Mental Health' },
  { name: 'Pediatrician', icon: '👶', desc: 'Child Health' },
  { name: 'Dentist', icon: '🦷', desc: 'Dental Care' },
  { name: 'Gynecologist', icon: '🤰', desc: 'Womens Health' },
  { name: 'ENT Specialist', icon: '👂', desc: 'Ear, Nose, Throat' },
  { name: 'General Physician', icon: '🩺', desc: 'General Care' },
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [topDoctors, setTopDoctors] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopDoctors = async () => {
      try {
        const res = await API.get('/patient/doctors?limit=3');
        setTopDoctors(res.data.data);
      } catch (err) {
        console.error('Failed to load top doctors:', err);
      }
    };
    fetchTopDoctors();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/patient/search?search=${encodeURIComponent(searchTerm)}`);
  };

  const handleSpecialtyClick = (name) => {
    navigate(`/patient/search?specialization=${encodeURIComponent(name)}`);
  };

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent pt-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary text-xs font-bold uppercase tracking-wider">
              <Activity size={14} className="animate-pulse" /> Digital Medical Network
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              Your Health, <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Connected Digitally.
              </span>
            </h1>
            
            <p className="text-slate-650 dark:text-slate-400 text-lg leading-relaxed max-w-lg">
              Book real-time physical or video consultations with top-tier verified medical professionals. Clean, secure, and hassle-free scheduling.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-premium border border-slate-100 dark:border-slate-800">
              <div className="flex-1 flex items-center gap-2 px-3">
                <Search className="text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search doctor names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent outline-none border-none text-sm text-slate-800 dark:text-white"
                />
              </div>
              <button type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-all">
                Search
              </button>
            </form>
          </motion.div>

          {/* Hero Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex justify-center"
          >
            <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-primary/25 to-secondary/25 absolute -z-10 blur-3xl" />
            <div className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-premium border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden flex flex-col justify-between h-80 bg-white/45 dark:bg-slate-900/40">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center font-bold">
                  <span>Rx</span>
                </div>
                <div className="px-2.5 py-1 bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary rounded-full text-xs font-bold">
                  Online Booking
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Instant Diagnostics</h3>
                <p className="text-xs text-slate-400 mt-2">Get immediate digital scripts and clinical reports within minutes of your slot.</p>
              </div>
              <Link to="/patient/search" className="flex items-center gap-2 text-sm font-bold text-primary dark:text-secondary group">
                Find doctor <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Specializations Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Browse by Specialization</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">Explore verified specialists by category to address your symptoms.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {specializationsList.map((spec, index) => (
            <motion.div
              whileHover={{ y: -5 }}
              key={spec.name}
              onClick={() => handleSpecialtyClick(spec.name)}
              className="p-5 glass-panel hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl cursor-pointer text-center space-y-3 transition-all"
            >
              <div className="text-3xl">{spec.icon}</div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-250 truncate">{spec.name}</h3>
              <p className="text-xs text-slate-400">{spec.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Top Rated Doctors */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-3 text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Top Rated Doctors</h2>
            <p className="text-sm text-slate-500">Book consultations with our highly recommended practitioners.</p>
          </div>
          <Link to="/patient/search" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-primary dark:text-secondary group">
            See all doctors <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topDoctors.length === 0 ? (
            // Shimmer skeletons
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl animate-shimmer" />
            ))
          ) : (
            topDoctors.map((doc) => (
              <div key={doc._id} className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-5 space-y-4 hover:shadow-premium-hover transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/25 to-secondary/25 flex items-center justify-center text-xl font-bold">
                    🩺
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-800 dark:text-white truncate">Dr. {doc.userId?.name}</h3>
                    <p className="text-xs text-primary dark:text-secondary font-bold">{doc.specialization}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{doc.experience} years experience</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={14} fill="currentColor" /> {doc.averageRating || 'N/A'} <span className="text-slate-400 font-normal">({doc.ratingsCount})</span>
                  </div>
                  <div className="text-slate-800 dark:text-slate-300">
                    Consultation Fee: <span className="font-extrabold text-slate-800 dark:text-white">${doc.fees}</span>
                  </div>
                </div>

                <Link
                  to={`/patient/search?search=${doc.userId?.name}`}
                  className="block w-full py-2.5 text-center text-sm font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors"
                >
                  View Details & Book
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section className="bg-slate-900 text-white py-16 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight">How It Works</h2>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">Get your medical checkup in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary/20 text-primary mx-auto rounded-full flex items-center justify-center text-lg font-bold">1</div>
              <h3 className="text-lg font-bold">Find a Specialist</h3>
              <p className="text-sm text-slate-400">Filter through our catalog of verified medical professionals by symptoms, location, and fees.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-secondary/20 text-secondary mx-auto rounded-full flex items-center justify-center text-lg font-bold">2</div>
              <h3 className="text-lg font-bold">Select Date & Book</h3>
              <p className="text-sm text-slate-400">Choose a convenient slot from the doctor's weekly timetable and pay securely via Stripe.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent/20 text-accent mx-auto rounded-full flex items-center justify-center text-lg font-bold">3</div>
              <h3 className="text-lg font-bold">Begin Consultation</h3>
              <p className="text-sm text-slate-400">Join a dynamic video call or chat privately, then download invoices and prescription scripts instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Trust / Features Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex gap-4 items-start text-left">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary"><Award size={24} /></div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white">Certified Professionals</h4>
            <p className="text-xs text-slate-400 mt-1">Every practitioner profile is vetted and approved by board administrators before taking slots.</p>
          </div>
        </div>
        <div className="flex gap-4 items-start text-left">
          <div className="p-3 rounded-2xl bg-secondary/10 text-secondary"><Shield size={24} /></div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white">Secured Transactions</h4>
            <p className="text-xs text-slate-400 mt-1">Stripe checkout integrations shield your credentials and verify consultation fees securely.</p>
          </div>
        </div>
        <div className="flex gap-4 items-start text-left">
          <div className="p-3 rounded-2xl bg-accent/10 text-accent"><Heart size={24} /></div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white">Patient First Care</h4>
            <p className="text-xs text-slate-400 mt-1">Easily configure medicine reminders, upload medical records, and exchange history files.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
