import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Loader, ArrowRight, Upload, Phone, MapPin, Award } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import toast from 'react-hot-toast';

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

export default function Register() {
  const [role, setRole] = useState('patient'); // patient, doctor
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Doctor-specific fields
  const [specialization, setSpecialization] = useState('General Physician');
  const [experience, setExperience] = useState('');
  const [fees, setFees] = useState('');
  const [location, setLocation] = useState('');
  const [education, setEducation] = useState('');
  const [bio, setBio] = useState('');
  const [certificates, setCertificates] = useState([]);

  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setCertificates(Array.from(e.target.files));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('role', role);

    if (role === 'doctor') {
      formData.append('specialization', specialization);
      formData.append('experience', experience);
      formData.append('fees', fees);
      formData.append('location', location);
      formData.append('education', education);
      formData.append('bio', bio);
      
      // Append files
      certificates.forEach((file) => {
        formData.append('certificates', file);
      });
    }

    const res = await register(formData);
    if (res.success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full glass-panel rounded-3xl p-8 shadow-premium border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary items-center justify-center text-white font-bold shadow-md mx-auto">
            <span>M</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Create Account</h2>
          <p className="text-xs text-slate-400">Join the MediConnect digital network today.</p>
        </div>

        {/* Role Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl mb-6">
          {['patient', 'doctor'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl capitalize transition-all ${
                role === r
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Join as {r}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
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
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Doctor Specific Form Fields */}
          {role === 'doctor' && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 space-y-4">
              <p className="text-xs uppercase font-bold tracking-wider text-primary dark:text-secondary mb-3">Professional Credentials</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm"
                  >
                    {specializations.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Years of Experience</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 8"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation Fee ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 100"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Education / Degree</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MD - Yale Medicine"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm"
                  />
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
                      placeholder="e.g. 500 Park Avenue, NY"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Short Biography</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Tell patients about your clinical focus and background..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Professional Certifications</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all relative">
                      <input
                        type="file"
                        multiple
                        required
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="text-center text-xs text-slate-400 space-y-1">
                        <Upload className="mx-auto text-slate-300" size={20} />
                        <p className="font-bold text-slate-500">Click to upload certificates</p>
                        <p>Supports PDFs & images (Max 5 files)</p>
                      </div>
                    </div>
                    {certificates.length > 0 && (
                      <div className="text-xs text-primary font-bold">
                        Attached: {certificates.map(f => f.name).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : 'Create Account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary dark:text-secondary hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
