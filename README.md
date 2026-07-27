# ProctorAI 🛡️🤖
### AI-Powered Secure Assignment & Examination Platform

**ProctorAI** is a modern, high-performance, web-based examination and assignment platform. Built with React, Vite, TailwindCSS, and NVIDIA NIM AI, it allows course instructors to create assignments, generate dynamic 1-minute rotating passcodes, and monitor proctored exams where **100 different students receive 100 non-identical AI-generated question sets**.

![React](https://img.shields.io/badge/React-18-blue.svg) ![Vite](https://img.shields.io/badge/Vite-8-indigo.svg) ![NVIDIA NIM](https://img.shields.io/badge/NVIDIA%20NIM-AI-emerald.svg) ![Vercel](https://img.shields.io/badge/Vercel-Serverless-black.svg)

---

## 🌟 Key Features

### 🤖 1. NVIDIA NIM AI Unique Question Synthesizer
- Integrated with **NVIDIA NIM API** (`https://integrate.api.nvidia.com/v1`) supporting models like **Llama 3.1 405B**, **DeepSeek R1**, **DeepSeek V3**, and **Nemotron 70B**.
- Uses each student's **College Register Number** as a variation seed: **100 students receive 100 unique MCQ sets** tailored to the course topic.
- Includes a smart offline fallback synthesizer if no API key is provided.

### ⏱️ 2. 1-Minute Dynamic Rotating Passcode System
- 60-second TOTP passcode generator with an animated radial countdown gauge on the Admin screen.
- Passcodes rotate automatically every minute to prevent students from sharing codes with others later.

### 🛡️ 3. Anti-Cheat Proctoring Lockdown System
- **Strict Fullscreen Enforcement**: Requests full screen upon start; overlay locks exam if exited.
- **Tab Swapping / Window Focus Detection**: Monitors `visibilitychange` & `blur` events with automated warning counter (max 2 warnings allowed before auto-submission).
- **Security Action Blockers**: Disables right-click context menu, copy/paste shortcuts (`Ctrl+C`, `Ctrl+V`), screenshot key (`PrtScn`), and Developer Tools (`F12`).

### 🔒 4. Admin Access & Role Separation
- Instructor Dashboard protected by an **Admin Access Password** (default set to `admin`, customizable in settings).
- Students opening shareable exam links land strictly on the **Student Exam Portal** with no access to Admin controls.

### 🌐 5. Built-in Vercel Serverless Backend API (`api/`)
- Includes Vercel Serverless Functions (`api/submissions.js` and `api/exams.js`).
- Automatically collects student submissions from 100 different mobile phones and syncs them to your central Admin Dashboard in real-time.

### 📱 6. Mobile-First Glassmorphism UI
- Fully responsive across mobile smartphones, tablets, and laptops.
- Features a mobile horizontal question selector, touch-friendly option cards, glowing status badges, and smooth animations.

---

## 📂 Project Structure

```
ProctorAI/
├── api/
│   ├── exams.js              # Vercel Serverless Function (Exam Sync)
│   └── submissions.js        # Vercel Serverless Function (Submissions Sync)
├── public/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx               # Header & Brand Logo
│   │   ├── PasscodeTimerBadge.jsx   # 1-Minute Rotating Passcode Gauge
│   │   ├── QuestionCard.jsx         # Exam Question Viewer & Option Selector
│   │   ├── ResultCard.jsx           # Performance Report & AI Answer Explanations
│   │   └── SecurityWarningModal.jsx # Proctoring Warning Overlay
│   ├── pages/
│   │   ├── AdminDashboard.jsx       # Course Instructor Control Panel
│   │   ├── ExamProctor.jsx          # Secure Test Execution Environment
│   │   └── StudentAuth.jsx          # Student Authentication & Security Agreement
│   ├── services/
│   │   ├── aiService.js             # NVIDIA NIM & OpenCode AI Integration
│   │   ├── passcodeService.js       # 1-Minute TOTP Passcode Engine
│   │   ├── proctorService.js        # Anti-Cheat Event Listeners & Lockdown
│   │   └── storageService.js        # Database & Hybrid Cloud Sync
│   ├── App.jsx                      # App Router & Main Layout
│   ├── index.css                    # Glassmorphism Design System & Utility Classes
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js                   # Vite Proxy Configuration
└── README.md
```

---

## 🚀 Quick Start (Local Development)

1. **Clone repository & install dependencies**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ProctorAI.git
   cd ProctorAI
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Admin Dashboard Login**:
   - Navigate to `http://localhost:5173/#admin`
   - Default Password: `admin`

---

## ⚡ Deployment to Vercel (1-Minute Setup)

Deploying both Frontend and Serverless Backend API is instant using Vercel CLI:

```bash
npx vercel
```

Follow the prompts:
- Accept all default options by pressing Enter.
- Vercel will output your live URL (e.g. `https://proctorai.vercel.app`).

### Sharing with Students:
1. Go to your live URL's Admin page (`https://proctorai.vercel.app/#admin`).
2. Input your **NVIDIA API Key** (`nvapi-...`) under **NVIDIA AI & Settings**.
3. Create an exam topic (e.g. *Generative AI Foundations*).
4. Click **Copy Student Exam Link** and share it with students. Students access the exam directly without seeing Admin controls!

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
