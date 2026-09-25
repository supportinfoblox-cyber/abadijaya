'use client';

import { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function LoginView() {
  const { login, sessionNotice, clearSessionNotice } = useTicketOps();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (sessionNotice) clearSessionNotice();
    setIsLoading(true);

    if (typeof localStorage !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem('ticketops_remember', 'true');
      } else {
        localStorage.removeItem('ticketops_remember');
      }
    }

    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.error || 'Username atau password tidak valid');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memproses login');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'radial-gradient(var(--grid-dot-color) 1px, transparent 1px), radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)',
      backgroundSize: '28px 28px, 100% 100%, 100% 100%',
      backgroundColor: 'var(--bg-primary)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.08)',
        filter: 'blur(100px)',
        top: '-150px',
        left: '-100px',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.06)',
        filter: 'blur(100px)',
        bottom: '-100px',
        right: '-100px',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '460px',
        zIndex: 10,
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="Portal Abadi Jaya"
            style={{
              height: '150px',
              maxWidth: '100%',
              objectFit: 'contain',
              marginBottom: '10px',
              filter: 'drop-shadow(0 8px 25px rgba(99, 102, 241, 0.45))',
            }}
          />
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            margin: '2px 0 0 0',
          }}>
            Sistem tiket Manajemen Operasional
          </p>

          {/* Connected Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '20px',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}>
              <CheckCircle2 size={12} /> iCare OTRS Live Sync
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-panel" style={{
          padding: '32px',
          borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
          }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Masuk ke Akun
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Silakan masukkan kredensial akun Anda
              </p>
            </div>
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-subtle)',
            }}>
              <Shield size={18} />
            </div>
          </div>

          {sessionNotice && (
            <div style={{
              padding: '11px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#f59e0b',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              marginBottom: '18px',
              lineHeight: 1.45,
            }}>
              <Clock size={16} style={{ flexShrink: 0 }} />
              <span>{sessionNotice}</span>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Username / Email Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}>
                Username / Email
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  name="auth_usr_input"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    if (sessionNotice) clearSessionNotice();
                  }}
                  placeholder="Username atau email"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}>
                Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="auth_pwd_input"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (sessionNotice) clearSessionNotice();
                  }}
                  placeholder="Masukkan kata sandi"
                  autoComplete="new-password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                Ingat sesi di perangkat ini
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                marginTop: '6px',
              }}
              onMouseEnter={e => {
                if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                if (!isLoading) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <LogIn size={18} />
              {isLoading ? 'Memvalidasi ke iCare OTRS...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          {/* Security & Multi-Account Notice */}
          <div style={{
            marginTop: '22px',
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
              <Shield size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span>Dukungan Akun iCare OTRS & Akun Lokal</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              Anggota tim dapat masuk menggunakan username & kata sandi iCare masing-masing, atau menggunakan akun lokal TicketOps.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
