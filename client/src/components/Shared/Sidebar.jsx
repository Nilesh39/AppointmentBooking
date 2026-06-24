import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  User,
  Calendar,
  FileText,
  Clock,
  MessageSquare,
  Sliders,
  BarChart3,
  Users,
  Star,
  Settings,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

export default function Sidebar() {
  const { user } = useAuthStore();

  if (!user) return null;

  const links = {
    patient: [
      { path: '/patient/dashboard', label: 'Overview', icon: BarChart3 },
      { path: '/patient/profile', label: 'My Profile', icon: User },
      { path: '/patient/appointments', label: 'Appointments', icon: Calendar },
      { path: '/patient/records', label: 'Medical Records', icon: FileText },
      { path: '/patient/reminders', label: 'Pill Reminders', icon: Clock },
      { path: '/patient/chat', label: 'Consult Chat', icon: MessageSquare },
    ],
    doctor: [
      { path: '/doctor/dashboard', label: 'Overview', icon: BarChart3 },
      { path: '/doctor/profile', label: 'My Profile', icon: User },
      { path: '/doctor/availability', label: 'Manage Slots', icon: Sliders },
      { path: '/doctor/chat', label: 'Patient Chat', icon: MessageSquare },
    ],
    admin: [
      { path: '/admin/dashboard', label: 'Overview', icon: BarChart3 },
      { path: '/admin/doctors', label: 'Manage Doctors', icon: Sliders },
      { path: '/admin/patients', label: 'Manage Patients', icon: Users },
      { path: '/admin/reviews', label: 'Reviews', icon: Star },
      { path: '/admin/notifications', label: 'Broadcast Info', icon: Megaphone },
    ],
  };

  const currentLinks = links[user.role] || [];

  return (
    <aside className="w-full md:w-64 glass-panel border-b md:border-b-0 md:border-r border-slate-200/50 dark:border-slate-800/50 h-auto md:h-[calc(100vh-4rem)] p-2 md:p-4 flex flex-row md:flex-col transition-all duration-300">
      <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar gap-2 md:gap-0 md:space-y-1 flex-1 pb-1 md:pb-0">
        <p className="hidden md:block text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-3">
          Navigation Portal
        </p>
        
        {currentLinks.map((link) => {
          const IconComponent = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `whitespace-nowrap flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-primary dark:hover:text-white'
                }`
              }
            >
              <IconComponent size={16} className="md:w-[18px] md:h-[18px]" />
              {link.label}
            </NavLink>
          );
        })}
      </div>
      
      <div className="hidden md:block pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 text-center">
        MediConnect Portal v1.0
      </div>
    </aside>
  );
}
