import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../context/AuthContext';

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sysStatus, setSysStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('status');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    try {
      setError('');
      const [usersRes, logsRes, sysRes] = await Promise.all([
        axios.get(`${API_URL}/admin/users`),
        axios.get(`${API_URL}/admin/logs`),
        axios.get(`${API_URL}/admin/system`)
      ]);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
      setSysStatus(sysRes.data);
    } catch (err) {
      console.error("Error loading admin information:", err);
      setError(err.response?.data?.message || 'Access denied or API fetch failure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? All their recorded detections will be permanently erased.")) return;

    try {
      await axios.delete(`${API_URL}/admin/users/${id}`);
      // Refresh list
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete user.');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-red-400">
        <i className="fas fa-lock text-4xl mb-4"></i>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-slate-500 mt-2">Administrative credentials are required to view this panel.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-slate-400">Loading administrator controls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Command Panel</h1>
        <p className="text-slate-400 mt-1">Review system logs, hardware usage, and user roles.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-8 gap-4">
        <button
          onClick={() => setActiveTab('status')}
          className={`pb-4 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'status' 
              ? 'border-purple-500 text-purple-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          System Health
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'users' 
              ? 'border-purple-500 text-purple-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-4 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'logs' 
              ? 'border-purple-500 text-purple-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Event Logs
        </button>
      </div>

      {/* Tab: System Health */}
      {activeTab === 'status' && sysStatus && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* System Specs */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold mb-4">Host OS Information</h3>
            <div className="space-y-3 font-mono text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Operating System:</span>
                <span>{sysStatus.os}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">CPU Usage:</span>
                <span>{sysStatus.cpu_usage}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">RAM Status:</span>
                <span>{sysStatus.ram_usage}</span>
              </div>
            </div>
          </div>

          {/* Model Status */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold mb-4">AI Engine Specs</h3>
            <div className="space-y-3 font-mono text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Inference Engine:</span>
                <span>{sysStatus.ai_mode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">CUDA Acceleration:</span>
                <span className={sysStatus.has_gpu ? 'text-emerald-400' : 'text-amber-500'}>
                  {sysStatus.has_gpu ? 'Enabled (GPU)' : 'Disabled (CPU)'}
                </span>
              </div>
            </div>
          </div>

          {/* Database stats */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold mb-4">Database Records</h3>
            <div className="space-y-3 font-mono text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Total Detections Logged:</span>
                <span>{sysStatus.total_detections}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Registered Accounts:</span>
                <span>{sysStatus.total_users}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-5">ID</th>
                  <th className="p-5">Username</th>
                  <th className="p-5">Email</th>
                  <th className="p-5">Role</th>
                  <th className="p-5">Created</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-900/20">
                    <td className="p-5 font-mono text-slate-500">{u.id}</td>
                    <td className="p-5 font-semibold">{u.username}</td>
                    <td className="p-5 text-slate-300">{u.email}</td>
                    <td className="p-5 capitalize">
                      <span className={`px-2 py-0.5 rounded text-xs border font-medium ${
                        u.role === 'admin' 
                          ? 'bg-purple-950/40 border-purple-800/60 text-purple-400' 
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-5 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-5 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.username === 'admin'}
                        className="text-xs font-semibold text-red-500 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        Delete User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: System Logs */}
      {activeTab === 'logs' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden h-[500px] flex flex-col">
          <div className="overflow-y-auto flex-1 font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/10">
                    <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.event_type === 'ERROR' 
                          ? 'bg-red-950 text-red-400 border border-red-900/40' 
                          : log.event_type === 'WARNING' 
                            ? 'bg-amber-950 text-amber-400 border border-amber-900/40' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700/40'
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
