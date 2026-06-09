import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await register(username, email, password);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl glow-purple">
        <h2 className="text-3xl font-bold text-center text-slate-100 mb-2">Create Account</h2>
        <p className="text-slate-400 text-center mb-8">Register to access the live camera engine</p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg mb-6 text-sm">
            Registration successful! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="Choose password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
