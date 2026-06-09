import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-950/35 backdrop-blur-2xl sticky top-0 z-50 transition-colors duration-200 shadow-sm shadow-slate-200/5 dark:shadow-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                VISUAL RECOGNITION
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus:outline-none"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <i className="fas fa-sun text-lg text-amber-400"></i>
              ) : (
                <i className="fas fa-moon text-lg"></i>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
