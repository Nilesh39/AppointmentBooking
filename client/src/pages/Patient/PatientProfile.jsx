import React, { useState, useEffect } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { User, Phone, Calendar, Mail, Loader, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientProfile() {
  const { user, profile, updateProfile, loading, checkAuth } = useAuthStore();
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [dob, setDob] = useState(profile?.dob ? profile.dob.split('T')[0] : '');
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(profile?.profilePic || '');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
      setDob(profile.dob ? profile.dob.split('T')[0] : '');
      setPreviewUrl(profile.profilePic || '');
    }
    if (user) {
      setName(user.name || '');
    }
  }, [profile, user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('gender', gender);
    formData.append('dob', dob);
    if (profilePic) {
      formData.append('profilePic', profilePic);
    }

    const res = await updateProfile(formData, 'patient');
    if (res.success) {
      checkAuth();
    }
  };

  return (
    <PageWrapper className="max-w-2xl mx-auto glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Edit Profile</h2>
        <p className="text-xs text-slate-400">Update your patient file details and profile picture.</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* Profile Pic Upload */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-28 h-28 rounded-full border border-slate-250 dark:border-slate-800 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 shadow-md">
            {previewUrl ? (
              <img src={previewUrl.startsWith('/') ? `http://localhost:5000${previewUrl}` : previewUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-slate-400" />
            )}
            
            <label className="absolute bottom-0 inset-x-0 h-8 bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/85 transition-all">
              <Camera size={14} />
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
          <span className="text-[10px] text-slate-400">Click camera to upload profile photo</span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Phone size={16} />
              </span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0100"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date of Birth</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Calendar size={16} />
              </span>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

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
