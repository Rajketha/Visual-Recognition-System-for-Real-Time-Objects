import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.1),transparent_50%)] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-none">
          <span className="block text-slate-100">VISUAL RECOGNITION</span>
          <span className="block bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 bg-clip-text text-transparent">
            DEEP LEARNING PIPELINE
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10">
          Real-time object detection powered by Ultralytics YOLOv8 and Flask. Stream webcam video directly from your browser to the inference engine.
        </p>

        <div className="flex justify-center gap-4">
          {user ? (
            <Link
              to="/detection"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-lg transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg shadow-purple-500/20"
            >
              Launch Detection
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-lg transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg shadow-purple-500/20"
              >
                Get Started
              </Link>
              <Link
                to="/register"
                className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium rounded-lg text-lg border border-slate-700 transition-all duration-200"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-t border-slate-900 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-extrabold text-purple-400">92%+</div>
              <div className="text-slate-400 text-sm mt-1">Model Accuracy</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-cyan-400">&lt;45ms</div>
              <div className="text-slate-400 text-sm mt-1">Inference Latency</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-indigo-400">80+</div>
              <div className="text-slate-400 text-sm mt-1">Object Classes</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-emerald-400">60 FPS</div>
              <div className="text-slate-400 text-sm mt-1">Webcam Loop</div>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-100">Enterprise Applications</h2>
          <p className="text-slate-400 mt-2">Real-world computer vision solutions driven by deep neural networks.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 text-xl">
              <i className="fas fa-car-side"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3">AutoDrive</h3>
            <p className="text-slate-400">
              Autonomous driving platform simulating obstacle detection, trajectory mapping, and lane identification.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 text-xl">
              <i className="fas fa-heartbeat"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3">MediScan</h3>
            <p className="text-slate-400">
              AI-assisted pathology and anomaly detection for X-rays, MRI scans, and cellular scans.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 text-xl">
              <i className="fas fa-user-shield"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3">FaceID Pro</h3>
            <p className="text-slate-400">
              High-security facial profiling system featuring robust facial identification and liveness protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
