import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 dark:bg-slate-950 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold">
                <span>M</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                MediConnect
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Making professional healthcare accessible, immediate, and safe. Connecting you to verified specialists worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/patient/search" className="hover:text-primary transition-colors">Search Doctors</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary transition-colors">Book Consultations</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary transition-colors">Apply as Doctor</Link>
              </li>
            </ul>
          </div>

          {/* Specializations */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Specializations</h4>
            <ul className="grid grid-cols-2 gap-2 text-sm text-slate-400">
              <li>Cardiologist</li>
              <li>Dermatologist</li>
              <li>Neurologist</li>
              <li>Pediatrician</li>
              <li>Dentist</li>
              <li>Orthopedic</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3 text-sm text-slate-400">
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact & Support</h4>
            <p>Email: support@mediconnect.com</p>
            <p>Hotline: +1 800-555-0199</p>
            <p>Hours: Mon - Sun (24/7 Support)</p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} MediConnect. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Use</a>
            <a href="#" className="hover:text-slate-300">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
