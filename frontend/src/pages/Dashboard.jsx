import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total_detections: 0, avg_confidence: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [historyRes, analyticsRes] = await Promise.all([
          axios.get(`${API_URL}/history`),
          axios.get(`${API_URL}/analytics`)
        ]);
        setHistory(historyRes.data);
        setStats({
          total_detections: analyticsRes.data.total_detections,
          avg_confidence: analyticsRes.data.avg_confidence
        });
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to delete your entire detection history? This action is permanent.")) return;
    
    try {
      await axios.delete(`${API_URL}/history/clear`);
      setHistory([]);
      setStats({ total_detections: 0, avg_confidence: 0 });
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-slate-400">Loading system dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user?.username}!</h1>
          <p className="text-slate-400 mt-1">Here is a snapshot of your visual recognition analytics.</p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/detection"
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-500/20"
          >
            Start Camera
          </Link>
          <Link
            to="/analytics"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            View Analytics
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-1 font-semibold">Total Detections</p>
          <p className="text-3xl font-extrabold text-slate-100">{stats.total_detections}</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-1 font-semibold">Average Confidence</p>
          <p className="text-3xl font-extrabold text-purple-400">{stats.avg_confidence}%</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-1 font-semibold">Active Model</p>
          <p className="text-3xl font-extrabold text-indigo-400">YOLOv8 Nano</p>
        </div>
      </div>

      {/* History table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800/80 flex justify-between items-center">
          <h2 className="text-xl font-bold">Recent Activity</h2>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs bg-red-950 hover:bg-red-900 border border-red-900/40 text-red-400 px-3.5 py-1.5 rounded-lg transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <i className="fas fa-history text-4xl mb-4"></i>
              <p className="font-semibold text-lg">No detections logged yet</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Open the live detection page and start scanning objects to populate this feed.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-5">Preview</th>
                  <th className="p-5">Object</th>
                  <th className="p-5">Confidence</th>
                  <th className="p-5">Logged Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {history.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-5">
                      {record.image_path ? (
                        <img 
                          src={`http://localhost:5000${record.image_path}`} 
                          className="w-14 h-10 object-cover rounded-lg border border-slate-800 scale-x-[-1]" 
                          alt="Annotation"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="p-5 font-semibold text-slate-200 capitalize">{record.object_class}</td>
                    <td className="p-5">
                      <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-purple-400">
                        {record.confidence}%
                      </span>
                    </td>
                    <td className="p-5 text-slate-400">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
