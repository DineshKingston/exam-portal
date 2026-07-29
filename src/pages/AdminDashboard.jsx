import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, BookOpen, Key, Users, Sparkles, CheckCircle2, 
  AlertCircle, Trash2, ExternalLink, ShieldAlert, Copy, Check,
  Search, RefreshCw, Lock, Download, Cpu, Trophy, Clock
} from 'lucide-react';
import { 
  getAllExams, saveExam, deleteExam, 
  getAdminSettings, saveAdminSettings, 
  getAllSubmissions, deleteSubmission, verifyAdminPassword, fetchRemoteSubmissions, fetchRemoteExams 
} from '../services/storageService';
import { testOpenCodeApiKey, fetchAvailableApiModels } from '../services/aiService';
import PasscodeTimerBadge from '../components/PasscodeTimerBadge';

export default function AdminDashboard({ onNavigate, initialTab = 'exams', isAdminUnlocked, onUnlockAdmin }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Admin Auth Password Input State
  const [inputAdminPassword, setInputAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Dedicated Password Change State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState(null);

  // Exam Management State
  const [exams, setExams] = useState(() => getAllExams());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    title: '',
    topic: '',
    questionCount: 10,
    difficulty: 'Medium',
    useDynamicPasscode: true,
    staticPasscode: '123456',
    allowedRoster: ''
  });

  // Settings State
  const [settings, setSettings] = useState(() => getAdminSettings());
  const [apiTesting, setApiTesting] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);

  // Dynamic Models State
  const [fetchedModels, setFetchedModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchMsg, setModelFetchMsg] = useState(null);
  const [useCustomModelInput, setUseCustomModelInput] = useState(false);

  // Submissions & Audit Logs State
  const [submissions, setSubmissions] = useState(() => getAllSubmissions());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Copy Link Toast
  const [copiedExamId, setCopiedExamId] = useState(null);

  useEffect(() => {
    setExams(getAllExams());
    setSubmissions(getAllSubmissions());

    // Auto-fetch remote exams & submissions from Vercel Serverless Backend API
    fetchRemoteExams().then(updated => {
      if (updated && updated.length >= 0) {
        setExams(updated);
      }
    });

    fetchRemoteSubmissions().then(updated => {
      if (updated && updated.length >= 0) {
        setSubmissions(updated);
      }
    });
  }, [activeTab]);

  /* Handlers */
  const handleAdminPasswordSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (verifyAdminPassword(inputAdminPassword)) {
      onUnlockAdmin();
      setInputAdminPassword('');
    } else {
      setAuthError('Incorrect Admin Password!');
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setPasswordChangeMsg(null);

    if (!verifyAdminPassword(currentPasswordInput)) {
      setPasswordChangeMsg({ success: false, message: 'Current password is incorrect!' });
      return;
    }

    if (!newPasswordInput || newPasswordInput.length < 4) {
      setPasswordChangeMsg({ success: false, message: 'New password must be at least 4 characters long.' });
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeMsg({ success: false, message: 'New password and confirmation do not match.' });
      return;
    }

    const updated = saveAdminSettings({ adminPassword: newPasswordInput.trim() });
    setSettings(updated);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordChangeMsg({ success: true, message: 'Admin Password updated successfully!' });

    setTimeout(() => setPasswordChangeMsg(null), 4000);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const updated = saveAdminSettings(settings);
    setSettings(updated);
    setApiTestResult({ success: true, message: 'API & Cloud Settings saved successfully!' });
    setTimeout(() => setApiTestResult(null), 3000);
  };

  const handleTestApiKey = async () => {
    setApiTesting(true);
    setApiTestResult(null);
    const res = await testOpenCodeApiKey(settings.opencodeApiKey, settings.opencodeBaseUrl, settings.opencodeModel);
    setApiTestResult(res);
    setApiTesting(false);
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setModelFetchMsg(null);
    const res = await fetchAvailableApiModels(settings.opencodeApiKey, settings.opencodeBaseUrl);
    if (res.success && res.models.length > 0) {
      setFetchedModels(res.models);
      setModelFetchMsg({ success: true, message: `Loaded ${res.models.length} AI models from API endpoint!` });
    } else {
      setModelFetchMsg({ 
        success: false, 
        message: `${res.message} (Select your NVIDIA model from the comprehensive catalog list below).` 
      });
    }
    setIsFetchingModels(false);
  };

  const handleCreateExam = (e) => {
    e.preventDefault();
    if (!newExamForm.title || !newExamForm.topic) return;

    const created = saveExam(newExamForm);
    setExams(getAllExams());
    setShowCreateModal(false);
    setNewExamForm({
      title: '',
      topic: '',
      questionCount: 10,
      difficulty: 'Medium',
      useDynamicPasscode: true,
      staticPasscode: '123456'
    });
  };

  const handleDeleteExam = (examId) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      deleteExam(examId);
      setExams(getAllExams());
    }
  };

  const handleCopyLink = (examId) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#student-auth?examId=${examId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedExamId(examId);
    setTimeout(() => setCopiedExamId(null), 2500);
  };

  const handleDeleteSubmission = (submissionId) => {
    const updated = deleteSubmission(submissionId);
    setSubmissions(updated);
    setConfirmDeleteId(null);
  };

  // Filter & Sort Submissions — sorted by score/percentage descending
  const filteredSubmissions = submissions
    .filter(s => {
      const q = searchQuery.toLowerCase();
      const matchSearch = (
        s.studentName?.toLowerCase().includes(q) ||
        s.registerNo?.toLowerCase().includes(q) ||
        (s.examTitle && s.examTitle.toLowerCase().includes(q))
      );
      const matchExam = selectedExamFilter === 'all' || s.examId === selectedExamFilter;
      return matchSearch && matchExam;
    })
    .sort((a, b) => {
      // 1. Sort by Grade Percentage (Highest Marks First)
      if ((b.percentage ?? 0) !== (a.percentage ?? 0)) {
        return (b.percentage ?? 0) - (a.percentage ?? 0);
      }
      // 2. Sort by Raw Score
      if ((b.score ?? 0) !== (a.score ?? 0)) {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      // 3. Tiebreaker: Fastest Completion Time First
      if ((a.timeTakenSeconds ?? 0) !== (b.timeTakenSeconds ?? 0)) {
        return (a.timeTakenSeconds ?? 0) - (b.timeTakenSeconds ?? 0);
      }
      // 4. Tiebreaker: Fewest Proctor Flags First
      if ((a.violationsCount ?? 0) !== (b.violationsCount ?? 0)) {
        return (a.violationsCount ?? 0) - (b.violationsCount ?? 0);
      }
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

  // Comprehensive NVIDIA & OpenCode Catalog Models
  const nvidiaAndCatalogPresets = [
    { id: 'meta/llama-3.1-405b-instruct', name: 'NVIDIA: Llama 3.1 405B Instruct' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'NVIDIA: Llama 3.3 70B Instruct' },
    { id: 'deepseek-ai/deepseek-r1', name: 'NVIDIA / OpenCode: DeepSeek R1' },
    { id: 'deepseek-ai/deepseek-v3', name: 'NVIDIA: DeepSeek V3' },
    { id: 'meta/llama-3.1-70b-instruct', name: 'NVIDIA: Llama 3.1 70B Instruct' },
    { id: 'meta/llama-3.1-8b-instruct', name: 'NVIDIA: Llama 3.1 8B Instruct' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'NVIDIA: Llama 3.1 Nemotron 70B' },
    { id: 'mistralai/mistral-large-2-instruct', name: 'NVIDIA: Mistral Large 2' },
    { id: 'google/gemma-2-27b-it', name: 'NVIDIA: Gemma 2 27B' },
    { id: 'qwen/qwen2.5-72b-instruct', name: 'NVIDIA: Qwen 2.5 72B' },
    { id: 'opencode/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'opencode/gpt-4o', name: 'GPT-4o' }
  ];

  // Combined List of Models
  const combinedModelsList = [...nvidiaAndCatalogPresets];
  fetchedModels.forEach(m => {
    if (!combinedModelsList.some(item => item.id === m.id)) {
      combinedModelsList.push(m);
    }
  });

  // ================= ADMIN LOCK SCREEN =================
  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 animate-fade-in no-select">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-indigo-500/30 glow-indigo space-y-6 text-center">
          
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-7 h-7 text-indigo-400" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Course Admin Authentication
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your Admin Password to access exam management, AI settings, and student results.
            </p>
          </div>

          <form onSubmit={handleAdminPasswordSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter password..."
                value={inputAdminPassword}
                onChange={(e) => setInputAdminPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              Unlock Admin Dashboard
            </button>
          </form>

        </div>
      </div>
    );
  }

  // ================= UNLOCKED ADMIN DASHBOARD =================
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
      
      {/* Top Header Card */}
      <div className="glass-panel rounded-3xl p-5 sm:p-8 border border-slate-800 glow-indigo relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Course Instructor Control Dashboard
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              Exam & Assignment Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Create AI-powered topics, generate dynamic 1-minute passcodes, monitor live student submissions, and inspect proctoring violation logs.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-3 sm:px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105 shrink-0"
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Create New Exam Topic
          </button>
        </div>

        {/* Mobile Responsive Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-800 mt-6 sm:mt-8 pt-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'exams'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Active Exams ({exams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'api'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>NVIDIA AI & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'submissions'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Submissions ({submissions.length})</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: EXAMS & TOPICS ================= */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-800 hover:border-slate-700 transition-all space-y-4 relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                      {exam.difficulty} • {exam.questionCount} MCQs
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white mt-2 group-hover:text-indigo-300 transition-colors">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Topic: <strong className="text-slate-300">{exam.topic}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Dynamic 1-Minute Passcode Badge Component */}
                <PasscodeTimerBadge examId={exam.id} />

                {/* Exam Footer Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleCopyLink(exam.id)}
                    className="flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors bg-indigo-500/10 border border-indigo-500/20 py-2 px-3 rounded-lg sm:bg-transparent sm:border-0 sm:p-0"
                  >
                    {copiedExamId === exam.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Share Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Student Exam Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onNavigate('student-auth', { examId: exam.id })}
                    className="flex items-center justify-center gap-1 text-xs text-slate-300 hover:text-white font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-all"
                  >
                    <span>Launch Test Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: NVIDIA & OPENCODE AI SETTINGS + SECURITY ================= */}
      {activeTab === 'api' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          
          {/* Card 1: Change Admin Password */}
          <div className="glass-card rounded-2xl p-5 sm:p-8 border border-indigo-500/30 glow-indigo space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
                <Lock className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Security & Change Admin Password
                </h3>
                <p className="text-xs text-slate-400">
                  Update your Course Instructor password for locking the Admin Dashboard.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Admin Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password..."
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 4 characters"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              {passwordChangeMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                  passwordChangeMsg.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {passwordChangeMsg.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{passwordChangeMsg.message}</span>
                </div>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                Update Admin Password
              </button>
            </form>
          </div>

          {/* Card 2: AI & Cloud API Configuration */}
          <div className="glass-card rounded-2xl p-5 sm:p-8 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                NVIDIA AI & OpenCode Endpoint Configuration
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your NVIDIA NIM or OpenCode API key and select any model from the complete catalog.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  API Key (NVIDIA NIM or OpenCode)
                </label>
                <input
                  type="password"
                  value={settings.opencodeApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, opencodeApiKey: e.target.value })}
                  placeholder="nvapi-xxxxxxxxxxxxxxxxxxxxxxxx or sk-xxxxxxxx"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    API Base Endpoint URL
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Quick Endpoints:</span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, opencodeBaseUrl: 'https://integrate.api.nvidia.com/v1' })}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                    >
                      NVIDIA API
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, opencodeBaseUrl: 'https://api.opencode.ai/v1' })}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30"
                    >
                      OpenCode API
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.opencodeBaseUrl || 'https://integrate.api.nvidia.com/v1'}
                  onChange={(e) => setSettings({ ...settings, opencodeBaseUrl: e.target.value })}
                  placeholder="https://integrate.api.nvidia.com/v1"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono text-xs"
                />
              </div>

              {/* AI Model Selection Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    AI Model Selection (NVIDIA NIM Catalog)
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUseCustomModelInput(!useCustomModelInput)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      {useCustomModelInput ? 'Select from NVIDIA list' : 'Type custom Model ID'}
                    </button>

                    <button
                      type="button"
                      onClick={handleFetchModels}
                      disabled={isFetchingModels}
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md font-semibold"
                      title="Fetch models dynamically from API"
                    >
                      {isFetchingModels ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      <span>Fetch Live Models</span>
                    </button>
                  </div>
                </div>

                {modelFetchMsg && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium border ${
                    modelFetchMsg.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}>
                    {modelFetchMsg.message}
                  </div>
                )}

                {useCustomModelInput ? (
                  <input
                    type="text"
                    value={settings.opencodeModel || ''}
                    onChange={(e) => setSettings({ ...settings, opencodeModel: e.target.value })}
                    placeholder="Enter exact model ID (e.g. meta/llama-3.1-405b-instruct or deepseek-ai/deepseek-r1)"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono"
                  />
                ) : (
                  <select
                    value={settings.opencodeModel || 'meta/llama-3.1-405b-instruct'}
                    onChange={(e) => setSettings({ ...settings, opencodeModel: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-medium"
                  >
                    {combinedModelsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Optional Cloud DB Sync URL */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-emerald-300 mb-1">
                  Optional Cloud Database Endpoint URL (Supabase / Firebase / REST DB)
                </label>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co/rest/v1 or https://your-db.restdb.io/rest"
                  value={settings.cloudSyncUrl || ''}
                  onChange={(e) => setSettings({ ...settings, cloudSyncUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono text-xs"
                />
              </div>

              {/* Test Result Toast */}
              {apiTestResult && (
                <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                  apiTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {apiTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{apiTestResult.message}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
                >
                  Save Settings
                </button>

                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={apiTesting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                >
                  {apiTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Test API Connection</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ================= TAB 3: SUBMISSIONS & AUDITS ================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">

          {/* Header Row */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Student Results &amp; Audits
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranked Marks-Wise (Highest Score &amp; Grade first &bull; 🥇 1st, 🥈 2nd, 🥉 3rd Podium)
                </p>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name or reg no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs"
                />
              </div>
            </div>

            {/* Per-Exam Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedExamFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedExamFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                All Courses ({submissions.length})
              </button>
              {exams.map(exam => {
                const count = submissions.filter(s => s.examId === exam.id).length;
                return (
                  <button
                    key={exam.id}
                    onClick={() => setSelectedExamFilter(exam.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all max-w-[180px] truncate ${
                      selectedExamFilter === exam.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {exam.title} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Per-Course Podium (only when a specific course is selected) ── */}
          {selectedExamFilter !== 'all' && filteredSubmissions.length >= 1 && (
            <div className="glass-card rounded-2xl p-4 sm:p-6 border border-indigo-500/20 bg-indigo-950/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                {exams.find(e => e.id === selectedExamFilter)?.title} — Leaderboard
              </h4>

              {/* Podium Visual */}
              <div className="flex items-end justify-center gap-3 sm:gap-6 py-2">
                {/* 2nd Place */}
                {filteredSubmissions[1] && (
                  <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
                    <div className="w-10 h-10 rounded-full bg-slate-600/40 border-2 border-slate-400/50 flex items-center justify-center text-lg">🥈</div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-200 truncate max-w-[90px]">{filteredSubmissions[1].studentName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{filteredSubmissions[1].registerNo}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-1 inline-block ${filteredSubmissions[1].percentage >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {filteredSubmissions[1].percentage}%
                      </span>
                    </div>
                    <div className="w-full h-14 sm:h-16 bg-slate-600/25 border border-slate-600/40 rounded-t-xl flex items-center justify-center text-slate-400 text-xs font-bold">
                      2nd
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {filteredSubmissions[0] && (
                  <div className="flex flex-col items-center gap-2 w-28 sm:w-32">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">🥇</div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-white truncate max-w-[110px]">{filteredSubmissions[0].studentName}</p>
                      <p className="text-[10px] text-indigo-400 font-mono">{filteredSubmissions[0].registerNo}</p>
                      <span className={`text-sm font-black px-2 py-0.5 rounded-md mt-1 inline-block ${filteredSubmissions[0].percentage >= 50 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {filteredSubmissions[0].percentage}%
                      </span>
                    </div>
                    <div className="w-full h-20 sm:h-24 bg-amber-500/15 border border-amber-500/30 rounded-t-xl flex items-center justify-center text-amber-400 text-sm font-extrabold shadow-md shadow-amber-500/10">
                      1st 🏆
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {filteredSubmissions[2] && (
                  <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
                    <div className="w-10 h-10 rounded-full bg-orange-500/15 border-2 border-orange-400/40 flex items-center justify-center text-lg">🥉</div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-200 truncate max-w-[90px]">{filteredSubmissions[2].studentName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{filteredSubmissions[2].registerNo}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-1 inline-block ${filteredSubmissions[2].percentage >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {filteredSubmissions[2].percentage}%
                      </span>
                    </div>
                    <div className="w-full h-10 sm:h-12 bg-orange-500/10 border border-orange-500/25 rounded-t-xl flex items-center justify-center text-orange-400 text-xs font-bold">
                      3rd
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="glass-card rounded-2xl border border-slate-800 text-center py-16 text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-sm font-semibold">No submissions yet</p>
              <p className="text-xs mt-1 text-slate-600">Share an exam link with students to get started</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                {filteredSubmissions.map((sub, idx) => (
                  <div key={sub.id} className={`glass-card rounded-2xl border p-4 space-y-3 ${idx === 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${
                        idx === 0 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                        idx === 1 ? 'bg-slate-400/10 text-slate-300 border border-slate-600/30' :
                        idx === 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/25' :
                        'bg-slate-800 text-slate-500'
                      }`}>
                        <Trophy className="w-3 h-3" />
                        {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                          sub.percentage >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {sub.percentage}%
                        </span>
                        {/* Delete Button */}
                        {confirmDeleteId === sub.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteSubmission(sub.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(sub.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 transition-colors border border-rose-500/20"
                            title="Delete result"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">{sub.studentName}</p>
                      <p className="text-xs font-mono text-indigo-400 mt-0.5">{sub.registerNo}</p>
                      {selectedExamFilter === 'all' && sub.examTitle && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{sub.examTitle}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-xs font-bold text-slate-200">{sub.score} / {sub.totalQuestions}</span>
                      <div className="flex items-center gap-2">
                        {sub.violationsCount === 0 ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Clean
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> {sub.violationsCount} flag
                          </span>
                        )}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table View */}
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3.5 w-14 text-center">Rank</th>
                        <th className="px-4 py-3.5">Student</th>
                        <th className="px-4 py-3.5">Reg Number</th>
                        {selectedExamFilter === 'all' && <th className="px-4 py-3.5">Course</th>}
                        <th className="px-4 py-3.5">Score</th>
                        <th className="px-4 py-3.5">Grade</th>
                        <th className="px-4 py-3.5">IP &amp; Device</th>
                        <th className="px-4 py-3.5">Proctor</th>
                        <th className="px-4 py-3.5">Finished At</th>
                        <th className="px-4 py-3.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredSubmissions.map((sub, idx) => (
                        <tr key={sub.id} className={`group transition-colors hover:bg-slate-800/30 ${idx === 0 ? 'bg-amber-500/5' : ''}`}>
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-base">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                                <span className="text-slate-500 font-bold text-xs">#{idx + 1}</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{sub.studentName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-indigo-400">{sub.registerNo}</td>
                          {selectedExamFilter === 'all' && (
                            <td className="px-4 py-3.5 text-slate-400 max-w-[140px] truncate">{sub.examTitle || '—'}</td>
                          )}
                          <td className="px-4 py-3.5 font-bold text-slate-200">{sub.score} / {sub.totalQuestions}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              sub.percentage >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {sub.percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px]">
                            <div className="text-indigo-300 font-semibold">{sub.ipAddress || 'Verified'}</div>
                            <div className="text-slate-500 text-[10px]">{sub.deviceType || 'Desktop'} ({sub.browser || 'Browser'})</div>
                          </td>
                          <td className="px-4 py-3.5">
                            {sub.violationsCount === 0 ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                              </span>
                            ) : (
                              <span className="text-amber-400 font-semibold flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" /> {sub.violationsCount} Flag(s)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(sub.submittedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </td>
                          {/* Delete — Last Column */}
                          <td className="px-3 py-3.5 text-right">
                            {confirmDeleteId === sub.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleDeleteSubmission(sub.id)}
                                  className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-colors"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-md bg-slate-700 text-slate-300 text-[10px] font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(sub.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all text-[11px] font-semibold"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}


      {/* ================= CREATE EXAM MODAL ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                Create New Assignment / Exam
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Test - Computer Networks"
                  value={newExamForm.title}
                  onChange={(e) => setNewExamForm({ ...newExamForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Course Topic (AI Prompt Baseline)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures, Cloud Security, General Physics"
                  value={newExamForm.topic}
                  onChange={(e) => setNewExamForm({ ...newExamForm, topic: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Question Count
                  </label>
                  <select
                    value={newExamForm.questionCount}
                    onChange={(e) => setNewExamForm({ ...newExamForm, questionCount: parseInt(e.target.value, 10) })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  >
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={newExamForm.difficulty}
                    onChange={(e) => setNewExamForm({ ...newExamForm, difficulty: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  >
                    <option value="Easy">Easy (Conceptual)</option>
                    <option value="Medium">Medium (Balanced)</option>
                    <option value="Hard">Hard (Applied)</option>
                  </select>
                </div>
              </div>

              {/* Official Student Roster Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Official Student Roster (Optional)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Format: RegNo: Student Name</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={`2026REG001: Dinesh Kingston\n2026REG002: Ramesh Kumar`}
                  value={newExamForm.allowedRoster}
                  onChange={(e) => setNewExamForm({ ...newExamForm, allowedRoster: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 If specified, only listed Register Numbers can write this exam, and their official name is automatically locked to prevent fake names!
                </p>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-indigo-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Automatic Per-Student Unique Questions
                </div>
                <p className="text-slate-400">
                  Every student will receive a unique variant set of questions generated dynamically by AI based on their Register Number seed.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Create & Launch Exam
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
