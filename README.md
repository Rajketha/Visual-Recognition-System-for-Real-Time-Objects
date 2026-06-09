# Visual Recognition System

An industry-grade real-time object detection system linking a **React (Vite + Tailwind CSS)** frontend with a **Python Flask** API backend. Powered by the **YOLOv8** object detection model, user sessions are protected using **JWT Authentication** and state logs are recorded inside a relational **SQLite** database.

---

## Architecture Layout

```
├── backend/
│   ├── app.py                  # Main Flask entry point
│   ├── config.py               # Settings & upload configurations
│   ├── models.py               # SQLAlchemy Database schemas
│   ├── ai_engine.py            # YOLOv8 wrappers and simulated fallbacks
│   ├── routes/
│   │   ├── auth.py             # User signup, log in, session validations
│   │   ├── detect.py           # Real-time base64 frame scoring & histories
│   │   ├── analytics.py        # Chart data aggregates
│   │   └── admin.py            # Hardware stats, system log lookups
│   ├── tests/
│   │   └── test_auth.py        # Python API unit test suites
│   ├── static/uploads/         # Processed detection snapshot store
│   └── requirements.txt        # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable navigation elements
│   │   ├── context/            # AuthContext API providers
│   │   ├── pages/              # Landing, LiveDetection, Dashboard, Profile, AdminPanel
│   │   ├── App.jsx             # React router configuration
│   │   ├── main.jsx            # React root initialization
│   │   └── index.css           # Global Tailwind directives & glass styles
│   ├── package.json            # Node modules configuration
│   ├── vite.config.js          # Vite configuration
│   └── tailwind.config.js      # CSS structure settings
│
├── docker-compose.yml          # Container coordination definitions
└── README.md                   # Setup and system manual
```

---

## Features

- **Real-Time Webcam Streaming**: Directly accesses the web browser camera, streams base64 frame packages to Flask, and receives annotations.
- **Robust Model Fallbacks**: If standard deep learning weights or libraries are missing, a simulated engine will score frames so that demonstration is always functional.
- **JWT Auth & Authorization**: Role-based routing (User vs Admin).
- **Analytics Dashboard**: Aggregates records, displaying total metrics and trends via Chart.js.
- **Administrative Command Center**: Inspect logs, host CPU/RAM stats, and manage accounts.

---

## Setup & Running Locally

### 1. Run Backend (Python Flask)

1. Open a terminal inside the `/backend` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   python app.py
   ```
   *The Flask API will run at `http://localhost:5000`.*
   *A default admin account is seeded automatically: **username: `admin`**, **password: `admin123`**.*

### 2. Run Frontend (React + Vite)

1. Open a terminal inside the `/frontend` directory.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch development server:
   ```bash
   npm run dev
   ```
   *The website will load at `http://localhost:5173`.*

---

## Docker Compose Setup

Run both services in container isolation:
```bash
docker-compose up --build
```
- Frontend will map to port **`80`** (at `http://localhost:80`)
- Backend will map to port **`5000`**

---

## Testing API

Verify backend authorization states using Python's test runner:
```bash
python -m unittest backend/tests/test_auth.py
```
