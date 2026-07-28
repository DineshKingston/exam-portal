/**
 * Proctoring Lockdown Service - Anti-Cheat Security System
 */

import { logViolationEvent } from './storageService';

export class ProctorManager {
  constructor({ studentName, registerNo, examId, onViolation, maxWarnings = 2 }) {
    this.studentName = studentName;
    this.registerNo = registerNo;
    this.examId = examId;
    this.onViolation = onViolation;
    this.maxWarnings = maxWarnings;
    
    this.warningCount = 0;
    this.isActive = false;

    // Bound Event Handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleCopyPaste = this.handleCopyPaste.bind(this);
    // Mobile specific handlers
    this.handlePopState = this.handlePopState.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
  }

  /**
   * Request full screen mode on element
   */
  async requestFullscreen(element = document.documentElement) {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      return true;
    } catch (e) {
      console.warn('Fullscreen request blocked or denied:', e);
      return false;
    }
  }

  /**
   * Start security monitoring
   */
  startMonitoring() {
    if (this.isActive) return;
    this.isActive = true;

    // Attach listeners
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('copy', this.handleCopyPaste);
    document.addEventListener('paste', this.handleCopyPaste);
    document.addEventListener('cut', this.handleCopyPaste);

    // Mobile: Push a dummy history state so Back button triggers popstate instead of navigating away
    history.pushState({ exam: true }, '');
    window.addEventListener('popstate', this.handlePopState);

    // Mobile: App switch / tab close detection
    window.addEventListener('pagehide', this.handlePageHide);
  }

  /**
   * Stop security monitoring & remove listeners
   */
  stopMonitoring() {
    this.isActive = false;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('copy', this.handleCopyPaste);
    document.removeEventListener('paste', this.handleCopyPaste);
    document.removeEventListener('cut', this.handleCopyPaste);
    window.removeEventListener('popstate', this.handlePopState);
    window.removeEventListener('pagehide', this.handlePageHide);

    // Exit fullscreen if active
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /**
   * Register a security violation
   */
  triggerViolation(type, details) {
    if (!this.isActive) return;

    this.warningCount += 1;
    logViolationEvent({
      studentName: this.studentName,
      registerNo: this.registerNo,
      examId: this.examId,
      type,
      details: `${details} (Warning #${this.warningCount})`
    });

    const isMaxExceeded = this.warningCount > this.maxWarnings;

    if (typeof this.onViolation === 'function') {
      this.onViolation({
        type,
        details,
        warningCount: this.warningCount,
        maxWarnings: this.maxWarnings,
        isMaxExceeded
      });
    }
  }

  /* Handler Callbacks */

  handleVisibilityChange() {
    if (document.hidden) {
      this.triggerViolation(
        'TAB_SWITCH',
        'Student switched browser tab or minimized window.'
      );
    }
  }

  handleWindowBlur() {
    if (this.isActive) {
      this.triggerViolation(
        'FOCUS_LOST',
        'Exam window lost focus (window swap/split screen).'
      );
    }
  }

  handleFullscreenChange() {
    const isFullscreenNow = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFullscreenNow && this.isActive) {
      this.triggerViolation(
        'FULLSCREEN_EXIT',
        'Student exited full screen mode.'
      );
    }
  }

  handlePopState() {
    // Mobile back button pressed — push dummy state again to trap within exam page
    history.pushState({ exam: true }, '');
    this.triggerViolation(
      'BACK_BUTTON',
      'Mobile back button / navigation attempt blocked.'
    );
  }

  handlePageHide(e) {
    // Mobile: app switched to background or page unloading
    if (!e.persisted) {
      // Page is truly leaving (not bfcache)
      this.triggerViolation(
        'PAGE_EXIT',
        'Student attempted to leave the exam page.'
      );
    }
  }

  handleContextMenu(e) {
    e.preventDefault();
    this.triggerViolation('RIGHT_CLICK', 'Right-click context menu attempt blocked.');
    return false;
  }

  handleCopyPaste(e) {
    e.preventDefault();
    this.triggerViolation('CLIPBOARD_ACTION', 'Clipboard Copy/Paste attempt blocked.');
    return false;
  }

  handleKeydown(e) {
    // Block PrtScn key
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      this.triggerViolation('SCREENSHOT_ATTEMPT', 'PrintScreen key press blocked.');
      return false;
    }

    // Block F12 and Ctrl+Shift+I (DevTools)
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))) {
      e.preventDefault();
      this.triggerViolation('DEVTOOLS_ATTEMPT', 'Developer Tools shortcut blocked.');
      return false;
    }

    // Block Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, Ctrl+S
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['c', 'v', 'x', 'u', 'p', 's', 'a'].includes(key)) {
        e.preventDefault();
        this.triggerViolation('SHORTCUT_BLOCKED', `Keyboard shortcut Ctrl+${key.toUpperCase()} blocked.`);
        return false;
      }
    }
  }
}
