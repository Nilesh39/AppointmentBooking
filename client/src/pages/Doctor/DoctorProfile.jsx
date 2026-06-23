import React, { useState, useEffect } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { User, Mail, DollarSign, Award, GraduationCap, MapPin, Loader, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { BACKEND_URL } from '../../services/api.js';

const specializations = [
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

export default function DoctorProfile() {
  const { user, profile, updateProfile, loading, checkAuth } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [specialization, setSpecialization] = useState(profile?.specialization || 'General Physician');
  const [experience, setExperience] = useState(profile?.experience || '');
  const [fees, setFees] = useState(profile?.fees || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [education, setEducation] = useState(profile?.education || '');
  const [bio, setBio] = useState(profile?.bio || '');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile) {
      setSpecialization(profile.specialization || 'General Physician');
      setExperience(profile.experience || '');
      setFees(profile.fees || '');
      setLocation(profile.location || '');
      setEducation(profile.education || '');
      setBio(profile.bio || '');
    }
    if (user) {
      setName(user.name || '');
    }
  }, [profile, user]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const updates = {
      name,
      specialization,
      experience,
      fees,
      location,
      education,
      bio,
    };

    const res = await updateProfile(updates, 'doctor');
    if (res.success) {
      checkAuth();
    }
  };

  return (
    <PageWrapper className="max-w-3xl mx-auto glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Edit Profile</h2>
        <p className="text-xs text-slate-400">Update your clinical qualifications, pricing, and profile biography.</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Doctor Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email (Static)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Specialization</label>
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
            >
              {specializations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Years of Experience</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Award size={16} />
              </span>
              <input
                type="number"
                required
                min="0"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation Fee ($)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <DollarSign size={16} />
              </span>
              <input
                type="number"
                required
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Education / Degree</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <GraduationCap size={16} />
              </span>
              <input
                type="text"
                required
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Clinic Address / Location</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <MapPin size={16} />
              </span>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Clinical Biography</label>
            <textarea
              required
              rows="4"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm resize-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Existing certificates */}
        {profile?.certificates && profile.certificates.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider">Uploaded Professional Documents</label>
            <div className="flex flex-wrap gap-2">
              {profile.certificates.map((url, i) => (
                <a
                  key={i}
                  href={url.startsWith('/') ? `${BACKEND_URL}${url}` : url}
                  target="_blank"
                  className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-100"
                >
                  <FileText size={14} /> Certificate {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
        >
          {loading ? <Loader className="animate-spin" size={18} /> : 'Save Changes'}
        </button>
      </form>
    </PageWrapper>
  );
}
