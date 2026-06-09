import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../context/AuthContext';

const LiveDetection = () => {
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null); // Canvas for rendering bounding boxes
  const [isActive, setIsActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [fps, setFps] = useState(0);
  const [confidenceFilter, setConfidenceFilter] = useState(50); // 50%
  const [detections, setDetections] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Camera offline. Click "Start Camera" to initialize.');
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');

  // Premium interactive features
  const [boxColor, setBoxColor] = useState('#7c3aed');
  const [voiceAlerts, setVoiceAlerts] = useState(false);
  const [sessionLog, setSessionLog] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const lastAnnounced = useRef({});

  // Client-side text-to-speech announcer
  const speakNotification = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  let processingLoop = null;
  let frameCount = 0;
  let lastFpsUpdateTime = Date.now();
  
  // Offscreen canvas for grabbing frames to send to the API
  const offscreenCanvas = document.createElement('canvas');

  useEffect(() => {
    // Get list of cameras
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error listing cameras:", err);
      }
    };
    getCameras();
    
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setStatusMessage('Initializing camera...');
      const constraints = {
        video: selectedDevice 
          ? { deviceId: { exact: selectedDevice }, width: 640, height: 480, frameRate: { ideal: 60 } } 
          : { facingMode: 'user', width: 640, height: 480, frameRate: { ideal: 60 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsActive(true);
      setStatusMessage('Camera online running at 60 FPS. Click "Enable Detection" to start YOLOv8.');
    } catch (err) {
      console.error("Webcam startup error:", err);
      setStatusMessage(`Camera Access Failed: ${err.message}`);
    }
  };

  const stopCamera = () => {
    setIsActive(false);
    setIsDetecting(false);
    setDetections([]);
    setFps(0);
    setStatusMessage('Camera offline.');

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Clear overlay canvas
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  };

  const toggleDetection = () => {
    if (!isActive) return;
    setIsDetecting(!isDetecting);
    if (!isDetecting) {
      setStatusMessage('YOLOv8 Detection active — processing frames...');
    } else {
      setStatusMessage('Camera online. Detection paused.');
      setDetections([]);
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
    }
  };

  // Draw bounding boxes on client-side canvas overlay
  const drawBoundingBoxes = (dets) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !videoRef.current) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dets.forEach(d => {
      const [x1, y1, x2, y2] = d.box;
      const w = x2 - x1;
      const h = y2 - y1;

      // Set styles for bounding boxes
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, w, h);

      // Label background
      ctx.fillStyle = 'rgba(8, 11, 20, 0.85)';
      ctx.fillRect(x1, y1 - 25, 130, 25);

      // Label text
      ctx.fillStyle = boxColor;
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.fillText(
        `${d.class.toUpperCase()} ${Math.round(d.confidence * 100)}%`, 
        x1 + 5, 
        y1 - 7
      );
    });
  };

  // Frame processing loop
  useEffect(() => {
    if (!isActive || !isDetecting) {
      if (processingLoop) clearTimeout(processingLoop);
      return;
    }

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        processingLoop = setTimeout(processFrame, 33);
        return;
      }

      // Sync overlay canvas size to video aspect resolution
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Sync offscreen canvas size for capture
      offscreenCanvas.width = video.videoWidth;
      offscreenCanvas.height = video.videoHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      offscreenCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.6);

      try {
        const response = await axios.post(`${API_URL}/detect`, {
          frame: dataUrl
        });

        const { detections: serverDets } = response.data;
        
        // Filter based on selected slider confidence threshold
        const filteredDets = serverDets.filter(d => (d.confidence * 100) >= confidenceFilter);
        setDetections(filteredDets);
        
        // Render boxes on overlay canvas
        drawBoundingBoxes(filteredDets);

        // TTS Speech alerts
        if (voiceAlerts && filteredDets.length > 0) {
          filteredDets.forEach(d => {
            const cls = d.class;
            const now = Date.now();
            if (!lastAnnounced.current[cls] || now - lastAnnounced.current[cls] > 4000) {
              lastAnnounced.current[cls] = now;
              speakNotification(`${cls} detected`);
            }
          });
        }

        // Live Log Timeline Tracker
        if (filteredDets.length > 0) {
          const timestamp = new Date().toLocaleTimeString();
          const newEntries = [];
          filteredDets.forEach(d => {
            const alreadyLoggedRecently = newEntries.some(e => e.class === d.class);
            if (!alreadyLoggedRecently) {
              newEntries.push({
                id: Math.random().toString(36).substr(2, 9),
                class: d.class,
                confidence: Math.round(d.confidence * 100),
                time: timestamp,
                timeObj: Date.now()
              });
            }
          });
          if (newEntries.length > 0) {
            setSessionLog(prev => {
              const filteredNew = newEntries.filter(n => !prev.some(p => p.class === n.class && Date.now() - p.timeObj < 3500));
              return [...filteredNew, ...prev].slice(0, 20);
            });
          }
        }

        // Calculate FPS of the API responses
        frameCount++;
        const now = Date.now();
        if (now - lastFpsUpdateTime >= 1000) {
          setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdateTime)));
          frameCount = 0;
          lastFpsUpdateTime = now;
        }

      } catch (err) {
        console.error("Frame processing failure:", err);
      }

      // Continue the frame loop asynchronously
      processingLoop = setTimeout(processFrame, 33);
    };

    processFrame();

    return () => {
      if (processingLoop) clearTimeout(processingLoop);
    };
  }, [isActive, isDetecting, confidenceFilter, boxColor, voiceAlerts]);

  // Capture screenshot (combines video frame + canvas overlays)
  const captureScreenshot = () => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas) return;

    // Create a temporary canvas to merge video frame & bounding boxes
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw video frame (mirrored)
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // Reset transform to draw boxes normally (since overlay canvas is already mirrored via CSS)
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `detection_${Date.now()}.jpg`;
    link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-colors duration-200">
      
      {/* Cinematic Title Opening Animation */}
      <div className="text-center mb-12 animate-title-entry">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent animate-glow-pulse">
          VISUAL RECOGNITION SYSTEM
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm md:text-lg max-w-2xl mx-auto font-medium">
          Real-time object detection and spatial tracking powered by YOLOv8 and OpenCV.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-16">
        
        {/* Left Side: Camera view */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative rounded-2xl overflow-hidden aspect-video ios-glass border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center shadow-xl">
            
            {/* Raw video stream running in full 60 FPS */}
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              muted
              playsInline
            />

            {/* AI Bounding Box overlay layer mapped directly over the video */}
            <canvas 
              ref={overlayCanvasRef} 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none z-10"
            />

            {/* Offline view overlay */}
            {!isActive && (
              <div className="text-center p-6 z-10">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                  <i className="fas fa-video-slash text-2xl"></i>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Camera Feed Offline</p>
              </div>
            )}

            {/* HUD Indicators */}
            {isActive && (
              <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 border border-slate-200 dark:border-slate-700 z-20 shadow-md">
                <span className={`w-2.5 h-2.5 rounded-full ${isDetecting ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                {isDetecting ? 'DETECTION ACTIVE' : 'LIVE 60FPS PREVIEW'}
              </div>
            )}

            {isDetecting && fps > 0 && (
              <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-200 dark:border-slate-700 z-20 shadow-md text-slate-800 dark:text-slate-200">
                Inference rate: {fps} Hz
              </div>
            )}
          </div>

          {/* Device and status bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl ios-glass border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Device:</label>
              <select
                disabled={isActive}
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                {cameraDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="text-sm text-slate-600 dark:text-slate-400 font-mono">
              {statusMessage}
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex flex-wrap gap-4">
            {!isActive ? (
              <button
                onClick={startCamera}
                className="flex-1 min-w-[150px] py-4 bg-emerald-600 hover:bg-emerald-700 font-semibold text-white rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-play"></i> Start Camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 min-w-[150px] py-4 bg-red-600 hover:bg-red-700 font-semibold text-white rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-stop"></i> Stop Camera
              </button>
            )}

            <button
              onClick={toggleDetection}
              disabled={!isActive}
              className={`flex-1 min-w-[150px] py-4 font-semibold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                isDetecting 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <i className={isDetecting ? "fas fa-pause" : "fas fa-crosshairs"}></i>
              {isDetecting ? 'Pause Detection' : 'Enable Detection'}
            </button>

            <button
              onClick={captureScreenshot}
              disabled={!isActive}
              className="px-6 py-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <i className="fas fa-camera"></i> Snapshot
            </button>
          </div>
        </div>

        {/* Right Side: Detection Panel / Settings */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Detection Parameters</h3>
            
            <div className="space-y-6">
              {/* Slider */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Confidence Threshold</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono font-bold" style={{ color: boxColor }}>{confidenceFilter}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  style={{ accentColor: boxColor }}
                />
              </div>

              {/* Bounding Box Color picker */}
              <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-4">
                <span className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-3">Bounding Box Style</span>
                <div className="flex items-center gap-3">
                  {[
                    { value: '#7c3aed', colorClass: 'bg-purple-600 shadow-purple-500/35' },
                    { value: '#06b6d4', colorClass: 'bg-cyan-500 shadow-cyan-500/35' },
                    { value: '#10b981', colorClass: 'bg-emerald-500 shadow-emerald-500/35' },
                    { value: '#ec4899', colorClass: 'bg-pink-500 shadow-pink-500/35' },
                    { value: '#f59e0b', colorClass: 'bg-amber-500 shadow-amber-500/35' }
                  ].map((colorObj) => (
                    <button
                      key={colorObj.value}
                      onClick={() => setBoxColor(colorObj.value)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all duration-200 ${colorObj.colorClass} shadow-md ${
                        boxColor === colorObj.value ? 'scale-125 ring-2 ring-white dark:ring-slate-900 border-2 border-slate-800 dark:border-slate-100' : 'hover:scale-110 opacity-70'
                      }`}
                      title={`Select ${colorObj.value}`}
                    />
                  ))}
                </div>
              </div>

              {/* Speech Voice Alerts */}
              <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <i className={`fas ${voiceAlerts ? 'fa-volume-up' : 'fa-volume-mute'} text-slate-500`} style={{ color: voiceAlerts ? boxColor : undefined }}></i>
                    Voice Announcements
                  </span>
                  <span className="text-xs text-slate-400">Read out detected classes aloud</span>
                </div>
                
                <button
                  onClick={() => setVoiceAlerts(!voiceAlerts)}
                  className={`w-12 h-6 rounded-full transition-colors duration-200 relative p-1 cursor-pointer ${
                    voiceAlerts ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  style={{ backgroundColor: voiceAlerts ? boxColor : undefined }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow ${
                    voiceAlerts ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          </div>

          <div className="p-6 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800 shadow-md flex-1 min-h-[300px] flex flex-col">
            <div className="flex border-b border-slate-200/50 dark:border-slate-800/50 mb-4 pb-1 justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('live')}
                  className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'live'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  style={{ borderColor: activeTab === 'live' ? boxColor : 'transparent', color: activeTab === 'live' ? boxColor : undefined }}
                >
                  Live Monitor
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  style={{ borderColor: activeTab === 'history' ? boxColor : 'transparent', color: activeTab === 'history' ? boxColor : undefined }}
                >
                  History Timeline
                </button>
              </div>
              
              {activeTab === 'live' ? (
                isDetecting && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-500/20 px-2.5 py-0.5 rounded-full font-mono border border-purple-200 dark:border-purple-500/10 animate-pulse" style={{ color: boxColor, backgroundColor: `${boxColor}22`, borderColor: `${boxColor}33` }}>
                    {detections.length} item(s)
                  </span>
                )
              ) : (
                sessionLog.length > 0 && (
                  <button
                    onClick={() => setSessionLog([])}
                    className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )
              )}
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[350px] flex-1">
              {activeTab === 'live' ? (
                detections.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400 dark:text-slate-500">
                    <i className="fas fa-box-open text-3xl mb-3"></i>
                    <p className="text-sm font-medium">No active detections</p>
                    <p className="text-xs max-w-[180px] mt-1 mx-auto">Toggle detection or lower the confidence threshold slider.</p>
                  </div>
                ) : (
                  detections.map((det, index) => (
                    <div key={index} className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40 backdrop-blur-sm">
                      <span className="font-semibold text-sm tracking-wide text-slate-700 dark:text-slate-200 capitalize flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: boxColor }} />
                        {det.class}
                      </span>
                      <span className="text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/85 px-3 py-1 rounded-lg" style={{ color: boxColor }}>
                        {Math.round(det.confidence * 100)}%
                      </span>
                    </div>
                  ))
                )
              ) : (
                sessionLog.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400 dark:text-slate-500">
                    <i className="fas fa-history text-3xl mb-3"></i>
                    <p className="text-sm font-medium">Timeline empty</p>
                    <p className="text-xs max-w-[180px] mt-1 mx-auto">New objects will appear here in sequence as they are recognized.</p>
                  </div>
                ) : (
                  <div className="space-y-3 relative pl-3 border-l-2 border-slate-200/30 dark:border-slate-800/30">
                    {sessionLog.map((log) => (
                      <div key={log.id} className="relative bg-white/30 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-sm hover:scale-[1.01] transition-transform duration-200">
                        <div className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border bg-slate-950" style={{ borderColor: boxColor }} />
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm tracking-wide text-slate-700 dark:text-slate-200 capitalize">{log.class}</span>
                          <span className="text-[10px] font-mono text-slate-400">{log.time}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                          <span>Confidence: {log.confidence}%</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">Log Entry</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Feature Cards Section */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Visual System Capabilities</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
            High performance edge processing powered by cutting-edge neural architectures.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 text-xl">
              <i className="fas fa-bolt"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">60 FPS Local Stream</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Maintains full camera frame rates on screen with responsive canvas overlays updating coordinates dynamically.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 text-xl">
              <i className="fas fa-network-wired"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">YOLOv8 ONNX Core</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Executes high-efficiency 80-class object detection directly on CPU using OpenCV's DNN inference pipeline.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 text-xl">
              <i className="fas fa-fingerprint"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Hysteresis Stability</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Custom IoU tracking matches objects across frames, smoothing jitter and keeping labels persistent.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-8 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 text-xl">
              <i className="fas fa-camera"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Snapshot Capture</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Instantly export local JPEG files of the canvas overlays combined with the direct video preview frame.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-8 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 dark:text-pink-400 mb-6 text-xl">
              <i className="fas fa-video"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Dynamic Camera Picker</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Swap camera devices dynamically on the fly without reloading the application or resetting the detection state.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-8 rounded-2xl ios-glass border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 text-xl">
              <i className="fas fa-sliders-h"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Live Threshold Tuning</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Fine-tune classification confidence levels in real time to filter out low-probability detections and noise.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Credit */}
      <footer className="mt-20 pb-6 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200/50 dark:border-slate-800/50 pt-8">
        <p className="font-mono tracking-widest uppercase">Rajketha project &copy; {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
};

export default LiveDetection;
