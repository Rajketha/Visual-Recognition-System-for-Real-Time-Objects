import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-slate-400">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">User Profile</h1>

      <div className="glass-panel rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-6 pb-6 border-b border-slate-800">
          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-3xl font-bold text-white uppercase shadow-lg shadow-purple-500/20">
            {user.username.substring(0, 2)}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">{user.username}</h2>
            <p className="text-slate-400 capitalize">{user.role} Account</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Email Address</label>
            <div className="text-slate-200 text-lg bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              {user.email}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Account Created On</label>
            <div className="text-slate-200 text-lg bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              {new Date(user.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        <div className="pt-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">System Permissions</h3>
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-emerald-500">✔</span> Real-time camera feeds
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-emerald-500">✔</span> Detection analytics and reports
            </div>
            {user.role === 'admin' && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-emerald-500">✔</span> Administrative controls (Full Access)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
