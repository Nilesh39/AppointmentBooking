import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Sun, Moon, LogOut, User as UserIcon, Calendar, Menu, X, Home, Search, MessageSquare, LogIn, Layout } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore.js';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, connectSocket, disconnectSocket } = useSocketStore();
  
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Connect socket and fetch notifications on login
  useEffect(() => {
    if (user) {
      connectSocket(user._id);
      fetchNotifications();
    } else {
      disconnectSocket();
    }
  }, [user]);

  // Dark Mode side effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md">
                  <span className="text-xl font-bold font-serif">M</span>
                </div>
                <span className="text-xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
                  MediConnect
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className={`font-medium transition-colors ${isActive('/') ? 'text-primary dark:text-secondary' : 'text-slate-650 dark:text-slate-350 hover:text-primary dark:hover:text-secondary'}`}>
                Home
              </Link>
              {(!user || user.role === 'patient') && (
                <Link to="/patient/search" className={`font-medium transition-colors ${isActive('/patient/search') ? 'text-primary dark:text-secondary' : 'text-slate-650 dark:text-slate-350 hover:text-primary dark:hover:text-secondary'}`}>
                  Find Doctors
                </Link>
              )}

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-500 cursor-pointer active:scale-95 group overflow-hidden"
              >
                <div className="transition-transform duration-500 ease-out group-hover:rotate-45">
                  {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-500" />}
                </div>
              </button>

              {user ? (
                <div className="flex items-center space-x-4">
                  {/* Notifications */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Bell size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-80 rounded-2xl glass-panel shadow-premium border border-slate-200/50 dark:border-slate-800/50 p-4 animate-in fade-in slide-in-from-top-3 duration-200">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-800 dark:text-slate-100">Notifications</span>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-primary dark:text-secondary hover:underline font-semibold cursor-pointer"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="mt-2 max-h-60 overflow-y-auto space-y-2">
                          {notifications.length === 0 ? (
                            <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">No notifications yet.</p>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif._id}
                                onClick={() => markAsRead(notif._id)}
                                className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                                  notif.isRead
                                    ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                    : 'bg-primary/5 dark:bg-primary/10 border-l-2 border-primary'
                                }`}
                              >
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{notif.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Dropdown Profile Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center gap-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-3 w-52 rounded-2xl glass-panel shadow-premium border border-slate-200/50 dark:border-slate-800/50 p-2 animate-in fade-in slide-in-from-top-3 duration-200">
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                        </div>
                        <Link
                          to={`/${user.role}/dashboard`}
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl mt-1 transition-colors"
                        >
                          <Calendar size={16} />
                          Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl mt-1 transition-colors cursor-pointer"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-secondary font-semibold transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md font-semibold transition-colors duration-300"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Header Utility (just logo + dark mode toggle) */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-605 dark:text-slate-355 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-500 cursor-pointer active:scale-90 group overflow-hidden"
              >
                <div className="transition-transform duration-500 ease-out group-hover:rotate-45">
                  {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-500" />}
                </div>
              </button>
              {user && (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 📱 Mobile Bottom Floating Pill Navigation Bar */}
      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/40 dark:border-slate-800/40 rounded-full px-5 py-3 shadow-2xl shadow-primary/10 flex items-center justify-between transition-all duration-300">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all relative ${
            isActive('/') ? 'text-primary dark:text-secondary scale-110' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home size={18} />
          <span>Home</span>
          {isActive('/') && <span className="absolute -bottom-1.5 w-1 h-1 bg-primary dark:bg-secondary rounded-full" />}
        </Link>

        {(!user || user.role === 'patient') && (
          <Link
            to="/patient/search"
            className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all relative ${
              isActive('/patient/search') ? 'text-primary dark:text-secondary scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search size={18} />
            <span>Search</span>
            {isActive('/patient/search') && <span className="absolute -bottom-1.5 w-1 h-1 bg-primary dark:bg-secondary rounded-full" />}
          </Link>
        )}

        {user ? (
          <>
            <Link
              to={`/${user.role}/dashboard`}
              className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all relative ${
                location.pathname.startsWith(`/${user.role}/dashboard`) ? 'text-primary dark:text-secondary scale-110' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layout size={18} />
              <span>Dashboard</span>
              {location.pathname.startsWith(`/${user.role}/dashboard`) && <span className="absolute -bottom-1.5 w-1 h-1 bg-primary dark:bg-secondary rounded-full" />}
            </Link>

            <Link
              to={`/${user.role}/chat`}
              className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all relative ${
                location.pathname.startsWith(`/${user.role}/chat`) ? 'text-primary dark:text-secondary scale-110' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <MessageSquare size={18} />
              <span>Chat</span>
              {location.pathname.startsWith(`/${user.role}/chat`) && <span className="absolute -bottom-1.5 w-1 h-1 bg-primary dark:bg-secondary rounded-full" />}
            </Link>
          </>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all relative ${
              isActive('/login') ? 'text-primary dark:text-secondary scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LogIn size={18} />
            <span>Login</span>
            {isActive('/login') && <span className="absolute -bottom-1.5 w-1 h-1 bg-primary dark:bg-secondary rounded-full" />}
          </Link>
        )}
      </div>
    </>
  );
}
