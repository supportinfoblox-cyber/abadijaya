/**
 * Security Guard & Anti-DevTools Protection Layer
 * Mencegah inspeksi elemen (Inspect Element), pembukaan Developer Tools,
 * klik kanan (context menu), shortcut keyboard, dan akses console untuk melindungi data operasional.
 */

class SecurityGuard {
  private isDevToolsOpen: boolean = false;

  public init() {

    if (typeof window === 'undefined') return;

    this.disableContextMenu();
    this.disableDevToolsShortcuts();
    this.protectConsole();
    this.startDevToolsDetection();
  }

  /**
   * 1. Blokir Klik Kanan (Context Menu)
   */
  private disableContextMenu() {
    document.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      return false;
    }, { capture: true });
  }

  /**
   * 2. Blokir Tombol Pintas Keyboard Pengembang
   * (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S, dsb.)
   */
  private disableDevToolsShortcuts() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert('F12 (Developer Tools) dinonaktifkan.');
        return false;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Picker)
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert('Inspect Element dinonaktifkan.');
        return false;
      }

      // Ctrl+U (View Source)
      if (isCtrlOrCmd && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert('View Source dinonaktifkan.');
        return false;
      }

      // Ctrl+S (Save Page)
      if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Firefox: Ctrl+Shift+K
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { capture: true });
  }

  /**
   * 3. Bersihkan dan lindungi Console dari inspeksi log data rahasia
   */
  private protectConsole() {
    try {
      const noop = () => {};
      const warningTitle = 'font-size: 20px; font-weight: bold; color: #ef4444;';
      const warningText = 'font-size: 14px; color: #f59e0b;';

      const showConsoleWarning = () => {
        try {
          console.clear();
          console.log('%c⚠️ PERINGATAN KEAMANAN TICKETOPS ⚠️', warningTitle);
          console.log('%cArea ini hanya untuk personel berwenang. Akses pengembang dinonaktifkan demi perlindungan data dan integritas sistem.', warningText);
        } catch {}
      };

      showConsoleWarning();

      // Lindungi console output di production
      if (import.meta.env?.PROD) {
        window.console.log = noop;
        window.console.info = noop;
        window.console.warn = noop;
        window.console.debug = noop;
        window.console.table = noop;
      }
    } catch {
      // Abaikan error override console
    }
  }

  /**
   * 4. Deteksi Pembukaan DevTools (Dimensi Window & Timing Check)
   */
  private startDevToolsDetection() {
    const threshold = 160;

    const checkDevTools = () => {
      // Periksa selisih ukuran window luar vs dalam
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      if (widthDiff || heightDiff) {
        if (!this.isDevToolsOpen) {
          this.isDevToolsOpen = true;
          this.showDevToolsWarningOverlay();
        }
      } else {
        if (this.isDevToolsOpen) {
          this.isDevToolsOpen = false;
          this.removeDevToolsWarningOverlay();
        }
      }
    };

    window.addEventListener('resize', checkDevTools);
    setInterval(checkDevTools, 1000);

    // Anti-debugging loop saat devtools terdeteksi aktif
    setInterval(() => {
      if (this.isDevToolsOpen) {
        try {
          (function () {
            Function('debugger')();
          })();
        } catch {}
      }
    }, 1500);
  }

  /**
   * 5. Tampilkan Overlay Peringatan saat DevTools Terdeteksi Terbuka
   */
  private showDevToolsWarningOverlay() {
    if (document.getElementById('security-devtools-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'security-devtools-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(16px);
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-family: 'Inter', system-ui, sans-serif;
      text-align: center;
      padding: 24px;
    `;

    overlay.innerHTML = `
      <div style="
        max-width: 480px;
        background: rgba(30, 41, 59, 0.95);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      ">
        <div style="
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: #f8fafc;">
          Akses Developer Tools Dinonaktifkan
        </h3>
        <p style="font-size: 0.875rem; color: #94a3b8; line-height: 1.6; margin-bottom: 20px;">
          Demi keamanan dan kerahasiaan data operasional tiket BSI Infoblox, penggunaan Web Developer Tools dan inspeksi kode tidak diizinkan pada aplikasi ini.
        </p>
        <div style="
          font-size: 0.75rem;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          padding: 10px 14px;
          border-radius: 8px;
        ">
          Silakan tutup Developer Tools untuk melanjutkan penggunaan aplikasi normal.
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  private removeDevToolsWarningOverlay() {
    const overlay = document.getElementById('security-devtools-overlay');
    if (overlay) {
      overlay.remove();
    }
  }


  /**
   * Tampilkan Toast Alert singkat jika tombol pintas diblokir
   */
  private triggerSecurityAlert(message: string) {
    const existing = document.getElementById('security-toast-alert');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'security-toast-alert';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 0.82rem;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: fadeIn 0.2s ease-out;
      font-family: 'Inter', system-ui, sans-serif;
    `;

    toast.innerHTML = `
      <span style="color: #ef4444; display: flex;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      </span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

export const securityGuard = new SecurityGuard();
