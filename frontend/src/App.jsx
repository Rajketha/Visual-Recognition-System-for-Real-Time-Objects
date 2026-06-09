import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LiveDetection from './pages/LiveDetection';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

import { ThemeProvider } from './context/ThemeContext';

// Protected Route Guard
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400 font-mono">Verifying secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-hidden">
        
        {/* iOS-Style Background Gradient Blobs */}
        <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-purple-400/35 dark:bg-purple-600/20 blur-[130px] pointer-events-none z-0 animate-blob-pulse" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-cyan-400/35 dark:bg-cyan-600/20 blur-[130px] pointer-events-none z-0 animate-blob-pulse" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[30%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-pink-400/25 dark:bg-pink-600/15 blur-[110px] pointer-events-none z-0 animate-blob-pulse" style={{ animationDelay: '-10s' }} />

        <Navbar />
        <main className="flex-grow relative z-10">
          <Routes>
            <Route path="/" element={<LiveDetection />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/detection" 
              element={
                <ProtectedRoute>
                  <LiveDetection />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Only Route */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
            
            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
