import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${API_URL}/analytics`);
        setData(response.data);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-slate-400">Aggregating visual analytics reports...</p>
      </div>
    );
  }

  if (!data || data.total_detections === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
          <i className="fas fa-chart-pie text-2xl"></i>
        </div>
        <h2 className="text-xl font-bold">No Analytics Data Available</h2>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto">You need to record some object detections in the webcam view before dashboard insights are populated.</p>
      </div>
    );
  }

  // Set up data for Object Frequency Bar Chart
  const frequencyLabels = data.object_frequencies.map(f => f.label);
  const frequencyCounts = data.object_frequencies.map(f => f.count);

  const barChartData = {
    labels: frequencyLabels,
    datasets: [
      {
        label: 'Detected Count',
        data: frequencyCounts,
        backgroundColor: 'rgba(124, 58, 237, 0.65)',
        borderColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  // Set up data for Object Distribution Pie Chart
  const pieChartData = {
    labels: frequencyLabels,
    datasets: [
      {
        label: 'Distribution',
        data: frequencyCounts,
        backgroundColor: [
          'rgba(124, 58, 237, 0.65)',
          'rgba(6, 182, 212, 0.65)',
          'rgba(16, 185, 129, 0.65)',
          'rgba(245, 158, 11, 0.65)',
          'rgba(239, 68, 68, 0.65)',
          'rgba(236, 72, 153, 0.65)',
        ],
        borderColor: '#0f172a',
        borderWidth: 2,
      },
    ],
  };

  // Set up data for Timeline Line Chart
  const timelineLabels = data.timeline.map(t => {
    // Format date string
    const d = new Date(t.date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  const timelineCounts = data.timeline.map(t => t.count);

  const lineChartData = {
    labels: timelineLabels.length > 0 ? timelineLabels : ['No Data'],
    datasets: [
      {
        label: 'Daily Detection Trend',
        data: timelineCounts.length > 0 ? timelineCounts : [0],
        fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 3,
        tension: 0.35,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter' },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', stepSize: 1 },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics Reports</h1>
        <p className="text-slate-400 mt-1">Deep analysis of recognized object instances.</p>
      </div>

      {/* Analytics Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Line Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-[380px] flex flex-col">
          <h3 className="text-lg font-bold mb-4">Detection Timeline</h3>
          <div className="flex-1 relative">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-[380px] flex flex-col">
          <h3 className="text-lg font-bold mb-4">Top Recognized Categories</h3>
          <div className="flex-1 relative">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Pie Distribution */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-[350px] flex flex-col md:col-span-1">
          <h3 className="text-lg font-bold mb-4 font-sans">Object Shares</h3>
          <div className="flex-1 relative flex items-center justify-center">
            <div className="w-[200px] h-[200px]">
              <Pie data={pieChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-4">Detection Metrics Summary</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              This analytics profile evaluates model categorization performance over localized visual frame sessions. Use this data to analyze frequency rates, scene complexity profiles, and model inference counts.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1">Detections Logged</span>
              <span className="text-2xl font-bold text-slate-100">{data.total_detections}</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1">Avg confidence</span>
              <span className="text-2xl font-bold text-purple-400">{data.avg_confidence}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
