document.addEventListener("DOMContentLoaded", function () {
  // === PARTICLE SYSTEM ===
  class ParticleSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.particles = [];
      this.init();
    }

    init() {
      this.resize();
      this.createParticles();
      this.animate();
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    createParticles() {
      this.particles = [];
      for (let i = 0; i < 100; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          color: `hsl(${Math.random() * 60 + 180}, 100%, 60%)`,
        });
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

        this.ctx.save();
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
      requestAnimationFrame(() => this.animate());
    }
  }

  // Initialize particles
  const particleCanvas = document.querySelector(".title-particles");
  let particles;
  if (particleCanvas) {
    particles = new ParticleSystem(particleCanvas);
    window.addEventListener("resize", () => {
      particles.resize();
      particles.createParticles();
    });
  }

  // === CAMERA CONTROL ELEMENTS ===
  const video = document.getElementById("video");
  const overlay = document.getElementById("detectionOverlay");
  const videoContainer = document.getElementById("videoContainer");
  const status = document.getElementById("status");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const ctx = overlay.getContext("2d");

  let stream = null;
  let animationId = null;
  let isCameraActive = false;
  let isDetecting = false;

  function updateStatus(message) {
    status.textContent = message;
    status.classList.add("active");
    console.log("Status:", message);
  }

  // Start camera WITHOUT detection
  async function startCamera() {
    try {
      updateStatus("🔐 Requesting camera permission...");

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });

      video.srcObject = stream;

      video.onloadedmetadata = () => {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        video.play();

        // Update UI - CAMERA ACTIVE BUT NO DETECTION
        isCameraActive = true;
        videoContainer.classList.add("active");
        startBtn.disabled = true;
        stopBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-video"></i> <span>Live View</span>';

        updateStatus(
          "Camera active — click Start again to enable detection",
        );
        videoLoop(); // Only video loop, no detection
      };
    } catch (err) {
      console.error("Camera error:", err);
      updateStatus(`❌ Camera access denied: ${err.message}`);
      startBtn.disabled = false;
      startBtn.innerHTML = "▶️ Start Camera";
    }
  }

  // Toggle detection ON/OFF
  function toggleDetection() {
    isDetecting = !isDetecting;

    if (isDetecting) {
      startBtn.innerHTML = '<i class="fas fa-crosshairs"></i> <span>Detecting...</span>';
      updateStatus("Object detection ENABLED — scanning for objects...");
      overlay.classList.add("detected");
      detectLoop(); // Start detection
    } else {
      startBtn.innerHTML = '<i class="fas fa-video"></i> <span>Live View</span>';
      updateStatus("Camera active — click again to enable detection");
      overlay.classList.remove("detected");
      cancelAnimationFrame(animationId);
      videoLoop(); // Back to video only
    }
  }

  // VIDEO LOOP ONLY (no detection)
  function videoLoop() {
    if (!isCameraActive || video.readyState !== 4) {
      animationId = requestAnimationFrame(videoLoop);
      return;
    }

    // Just mirror video - NO DETECTION
    ctx.save();
    ctx.scale(-1, 1); // Flip horizontally for mirror effect
    ctx.drawImage(video, -overlay.width, 0, overlay.width, overlay.height);
    ctx.restore();

    animationId = requestAnimationFrame(videoLoop);
  }

  // DETECTION LOOP (only when enabled)
  function detectLoop() {
    if (!isCameraActive || !isDetecting || video.readyState !== 4) {
      animationId = requestAnimationFrame(detectLoop);
      return;
    }

    // Mirror video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -overlay.width, 0, overlay.width, overlay.height);
    ctx.restore();

    // Detection simulation (15% chance)
    if (Math.random() < 0.15) {
      ctx.strokeStyle = "#7c6fff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Multiple detection boxes
      const detections = [
        { x: 80,  y: 80,  w: 250, h: 180, label: "CHAIR",  conf: 92 },
        { x: overlay.width - 350, y: 100, w: 120, h: 100, label: "PERSON", conf: 95 },
        { x: 150, y: overlay.height - 200, w: 200, h: 120, label: "TABLE", conf: 89 },
      ];

      detections.forEach((d) => {
        // Bounding box
        ctx.strokeRect(d.x, d.y, d.w, d.h);

        // Label background
        ctx.fillStyle = "rgba(10,8,30,0.82)";
        ctx.fillRect(d.x, d.y - 32, 180, 28);

        // Label text
        ctx.fillStyle = "#a78bfa";
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${d.label}  ${d.conf}%`, d.x + d.w / 2, d.y - 10);
      });

      updateStatus(
        `Detected: ${detections.map((d) => d.label).join(' · ')}`,
      );
    }

    animationId = requestAnimationFrame(detectLoop);
  }

  // STOP CAMERA
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Reset everything
    isCameraActive = false;
    isDetecting = false;
    videoContainer.classList.remove("active");
    overlay.classList.remove("detected");
    startBtn.disabled = false;
    stopBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Camera';

    updateStatus("Camera stopped. Click Start to begin live view.");
    video.pause();
    video.srcObject = null;
  }

  // EVENT LISTENERS - CAMERA
  let clickCount = 0;
  startBtn.addEventListener("click", function (e) {
    clickCount++;

    if (!isCameraActive) {
      // First click: Start camera
      startCamera();
    } else {
      // Second click: Toggle detection
      toggleDetection();
    }

    // Reset click count after 2 seconds
    setTimeout(() => (clickCount = 0), 2000);
  });

  stopBtn.addEventListener("click", stopCamera);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && isCameraActive) {
      e.preventDefault();
      toggleDetection();
    }
    if (e.code === "Escape" && isCameraActive) {
      stopCamera();
    }
  });

  // === INTERACTIVE STEP CARDS (How It Works) ===
  document.querySelectorAll(".step-card").forEach((card) => {
    card.addEventListener("click", function () {
      // Remove active class from all step cards
      document.querySelectorAll(".step-card").forEach((c) => {
        c.classList.remove("active");
        const details = c.querySelector(".step-details");
        if (details) details.classList.add("hidden");
      });

      // Add active class to clicked card
      this.classList.add("active");
      const details = this.querySelector(".step-details");
      if (details) details.classList.remove("hidden");
    });
  });

  // === NAVIGATION & SCROLL EFFECTS ===
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll("nav a");
  const nav = document.getElementById("nav");

  // Smooth scrolling for nav links
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      target.scrollIntoView({ behavior: "smooth" });

      // Update active nav link
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Navbar scroll effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }

    // Update active nav link based on scroll position
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollY >= sectionTop - 200) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });

  // Section reveal on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, observerOptions);

  sections.forEach((section) => observer.observe(section));

  // Prevent context menu on canvas/video
  document.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "CANVAS" || e.target.tagName === "VIDEO") {
      e.preventDefault();
    }
  });

  // Cleanup on page unload
  window.addEventListener("beforeunload", stopCamera);
});