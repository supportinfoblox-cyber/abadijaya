'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Send,
  Save,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  User,
  MapPin,
  Bookmark,
  Sparkles,
  RefreshCw,
  Info,
  Check,
  X,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useTicketOps } from '@/context/TicketOpsContext';

export interface IcareTemplate {
  id: string;
  templateName: string;
  isDefault?: boolean;
  opnumber: string;
  sitename: string;
  epm: string;
  asgdate1?: string;
  asgdate2?: string;
  asgproject: string[];
  actdeploy: string;
  asgjob: string[];
  actstatus: '1' | '2'; // 1 = Done, 2 = In Progress
  techissue: 'YES' | 'NO';
  troubleticket: string;
  summary: string;
}

export interface AttendanceHistoryItem {
  id: string;
  submittedAt: string;
  engineerName?: string;
  engineerUsername?: string;
  opnumber: string;
  sitename: string;
  epm: string;
  asgdate1: string;
  asgdate2: string;
  jobAssignments: string[];
  actstatus: string;
  summary: string;
  submissionStatus: 'SUCCESS' | 'SUBMITTED_LOCAL';
}

const PROJECT_ASSIGNMENTS = [
  { value: '1', label: '1. Deployment Support' },
  { value: '2', label: '2. Warranty Support' },
  { value: '3', label: '3. Maintenance Support' },
  { value: '4', label: '4. Manage Services' },
  { value: '5', label: '5. Time and Material' },
];

const DEPLOYMENT_ACTIVITIES = [
  { value: '1', label: '1. Installation Check' },
  { value: '2', label: '2. Power Up' },
  { value: '3', label: '3. Test & Commissioning' },
  { value: '4', label: '4. Acceptance Test' },
  { value: '5', label: '5. Document Delivery' },
];

const JOB_ASSIGNMENTS = [
  { value: '1', label: '1. Waiting for Assignment' },
  { value: '2', label: '2. New Site Implementation' },
  { value: '3', label: '3. New Product Implementation' },
  { value: '4', label: '4. Software Update' },
  { value: '5', label: '5. Software Upgrade' },
  { value: '6', label: '6. Change Request/New Software Development' },
  { value: '7', label: '7. Network Monitoring' },
  { value: '8', label: '8. Data Provisioning' },
  { value: '9', label: '9. Re-Engineering/Re-Location' },
  { value: '10', label: '10. Re-Configuration' },
  { value: '11', label: '11. Expansion' },
  { value: '12', label: '12. On Call' },
  { value: '13', label: '13. PoC' },
  { value: '14', label: '14. Trial' },
  { value: '15', label: '15. Training' },
];

const DEFAULT_TEMPLATES: IcareTemplate[] = [
  {
    id: 'tpl-bsi-rutin',
    templateName: 'Support Rutin OP0899 BSI Infoblox',
    isDefault: true,
    opnumber: '0899',
    sitename: 'BSI Kantor Pusat (Wisma Atlet)',
    epm: 'Bambang',
    asgproject: ['4'], // Manage Services
    actdeploy: '',
    asgjob: ['7'], // Network Monitoring
    actstatus: '1', // Done
    techissue: 'NO',
    troubleticket: '',
    summary: 'Melakukan monitoring rutin stabilitas Grid Infoblox BSI, pengecekan utilisasi CPU & storage disk, verifikasi status sinkronisasi NTP server, dan verifikasi resolusi query DNS external & internal tanpa anomali.',
  },
  {
    id: 'tpl-bsi-pm',
    templateName: 'Preventive Maintenance OP0899 Onsite BSI',
    isDefault: false,
    opnumber: '0899',
    sitename: 'BSI Menara Thamrin',
    epm: 'Bambang',
    asgproject: ['3', '4'], // Maintenance Support + Manage Services
    actdeploy: '',
    asgjob: ['4', '10'], // Software Update + Re-Configuration
    actstatus: '1', // Done
    techissue: 'NO',
    troubleticket: '',
    summary: 'Pelaksanaan kegiatan Preventive Maintenance (PM) hardware Infoblox TE-2215: Backup database konfigurasi grid master, pengecekan fan & power supply redundan, uji failover HA, pembersihan cache DNS, dan rotasi log audit.',
  },
  {
    id: 'tpl-bsi-drp',
    templateName: 'Support DRP & Relokasi DNS OP0968',
    isDefault: false,
    opnumber: '0968',
    sitename: 'Data Center Surabaya / DRC Bandung',
    epm: 'Ady Kurniawan',
    asgproject: ['1', '4'], // Deployment Support + Manage Services
    actdeploy: '3', // Test & Commissioning
    asgjob: ['6', '9'], // Change Request + Re-Location
    actstatus: '1', // Done
    techissue: 'NO',
    troubleticket: '',
    summary: 'Mendampingi aktivitas DRP (Disaster Recovery Plan) Bank BSI: Verifikasi switchover pointing DNS service, pengecekan replication link antara DC Surabaya dan DRC Bandung, monitoring latency respon DNS.',
  },
];

const TEMPLATES_STORAGE_KEY = 'ticketops_icare_templates';
const HISTORY_STORAGE_KEY = 'ticketops_icare_history';
const SESSION_STORAGE_KEY = 'ticketops_icare_session';

export default function IcareAttendanceView() {
  const { currentUser } = useTicketOps();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Form Fields
  const [opnumber, setOpnumber] = useState('');
  const [sitename, setSitename] = useState('BSI Kantor Pusat (Wisma Atlet)');
  const [epm, setEpm] = useState('Bambang');
  const [asgdate1, setAsgdate1] = useState(todayStr);
  const [asgdate2, setAsgdate2] = useState(todayStr);
  const [asgproject, setAsgproject] = useState<string[]>(['4']);
  const [actdeploy, setActdeploy] = useState<string>('');
  const [asgjob, setAsgjob] = useState<string[]>(['7']);
  const [actstatus, setActstatus] = useState<'1' | '2'>('1');
  const [techissue, setTechissue] = useState<'YES' | 'NO'>('NO');
  const [troubleticket, setTroubleticket] = useState('');
  const [summary, setSummary] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  // Templates & History State
  const [templates, setTemplates] = useState<IcareTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved templates', e);
        }
      }
    }
    return DEFAULT_TEMPLATES;
  });

  const [history, setHistory] = useState<AttendanceHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }
    }
    return [];
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'form' | 'templates' | 'history'>('form');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedWA, setCopiedWA] = useState(false);

  // Initialize OP and Session based on the currently logged-in user
  useEffect(() => {
    const userKey = currentUser?.username || 'default';
    let userOp = '';
    if (typeof window !== 'undefined') {
      const savedOp = localStorage.getItem(`ticketops_icare_op_${userKey}`);
      if (savedOp) {
        userOp = savedOp;
      } else if (currentUser?.username === 'ismailak') {
        userOp = '0899';
      }

      const liveOtrsSession = sessionStorage.getItem('ticketops_otrs_session');
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (liveOtrsSession) {
        setSessionToken(liveOtrsSession);
      } else if (savedSession) {
        setSessionToken(savedSession);
      }
    }

    if (userOp) {
      setOpnumber(userOp);
    }

    const defaultTpl = templates.find(t => t.isDefault);
    if (defaultTpl) {
      applyTemplate(defaultTpl, false, userOp);
      setSelectedTemplateId(defaultTpl.id);
    }
  }, [currentUser]);

  // Handle OP change and persist per user
  const handleOpChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setOpnumber(clean);
    if (currentUser?.username && typeof window !== 'undefined') {
      localStorage.setItem(`ticketops_icare_op_${currentUser.username}`, clean);
    }
  };

  // Save templates to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    }
  }, [templates]);

  // Save history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  // Apply Template to Form without overwriting the user's personal OP
  const applyTemplate = (tpl: IcareTemplate, showFeedback = true, preservedOp?: string) => {
    if (preservedOp !== undefined && preservedOp !== '') {
      setOpnumber(preservedOp);
    } else if (opnumber && opnumber.length === 4) {
      // Retain current user's OP number
    } else {
      setOpnumber(tpl.opnumber);
    }
    setSitename(tpl.sitename);
    setEpm(tpl.epm);
    setAsgproject(tpl.asgproject || []);
    setActdeploy(tpl.actdeploy || '');
    setAsgjob(tpl.asgjob || []);
    setActstatus(tpl.actstatus || '1');
    setTechissue(tpl.techissue || 'NO');
    setTroubleticket(tpl.troubleticket || '');
    setSummary(tpl.summary || '');
    setSelectedTemplateId(tpl.id);

    if (showFeedback) {
      setSubmitFeedback({
        type: 'success',
        message: `Template "${tpl.templateName}" berhasil diterapkan ke formulir!`,
      });
      setTimeout(() => setSubmitFeedback(null), 3500);
      setActiveTab('form');
    }
  };

  // Save New Template
  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newTpl: IcareTemplate = {
      id: `tpl-${Date.now()}`,
      templateName: newTemplateName.trim(),
      isDefault: false,
      opnumber,
      sitename,
      epm,
      asgproject,
      actdeploy,
      asgjob,
      actstatus,
      techissue,
      troubleticket,
      summary,
    };

    setTemplates(prev => [newTpl, ...prev]);
    setSelectedTemplateId(newTpl.id);
    setIsSaveTemplateModalOpen(false);
    setNewTemplateName('');
    setSubmitFeedback({
      type: 'success',
      message: `Template "${newTpl.templateName}" berhasil disimpan!`,
    });
    setTimeout(() => setSubmitFeedback(null), 3500);
  };

  // Delete Template
  const handleDeleteTemplate = (id: string, name: string) => {
    if (confirm(`Hapus template "${name}"?`)) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedTemplateId === id) setSelectedTemplateId('');
    }
  };

  // Set Default Template
  const handleSetDefaultTemplate = (id: string) => {
    setTemplates(prev =>
      prev.map(t => ({
        ...t,
        isDefault: t.id === id,
      }))
    );
    setSubmitFeedback({
      type: 'success',
      message: 'Template default berhasil diperbarui!',
    });
    setTimeout(() => setSubmitFeedback(null), 3000);
  };

  // Toggle Project Assignment
  const toggleProjectAssignment = (val: string) => {
    setAsgproject(prev =>
      prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
    );
  };

  // Toggle Job Assignment
  const toggleJobAssignment = (val: string) => {
    setAsgjob(prev =>
      prev.includes(val) ? prev.filter(j => j !== val) : [...prev, val]
    );
  };

  // Copy to WhatsApp / Telegram
  const handleCopyFormattedWA = () => {
    const jobNames = asgjob
      .map(v => JOB_ASSIGNMENTS.find(j => j.value === v)?.label.replace(/^\d+\.\s*/, ''))
      .filter(Boolean)
      .join(', ');

    const engineerName = currentUser?.name || currentUser?.username || 'Engineer';

    const text = `*DAILY REPORT ENGINEER (iCare LT Integra)*
-------------------------------------------
*Engineer / Pelapor:* ${engineerName}
*OP:* ${opnumber}
*Site:* ${sitename}
*Project Manager:* ${epm}
*Tanggal:* ${asgdate1} s/d ${asgdate2}
*Job Assignment:* ${jobNames || '-'}
*Status:* ${actstatus === '1' ? 'Done (Selesai)' : 'In Progress (Sedang Berjalan)'}
*Technical Issue:* ${techissue}
*Trouble Ticket:* ${troubleticket || '-'}
-------------------------------------------
*Summary:*
${summary}
-------------------------------------------
_Disubmit oleh ${engineerName} via TicketOps Portal Manajemen Operasional_`;

    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  // Submit Absen
  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (opnumber.length !== 4) {
      alert('Nomor OP harus tepat 4 karakter (misal: 0899 atau 0968).');
      return;
    }
    if (asgjob.length === 0) {
      alert('Pilih minimal satu Job Assignment.');
      return;
    }
    if (!summary.trim()) {
      alert('Mohon isi Report Summary.');
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);

    const payload = {
      opnumber,
      sitename,
      epm,
      asgdate1,
      asgdate2,
      asgproject,
      actdeploy,
      asgjob,
      actstatus,
      techissue,
      troubleticket,
      summary,
      session: sessionToken,
    };

    let serverSuccess = false;

    try {
      // Attempt sending to local Vite proxy endpoint
      const res = await fetch('/api/icare/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          serverSuccess = true;
        }
      }
    } catch (err) {
      console.warn('Backend proxy fetch error, saving to local history:', err);
    }

    // Save to local submission history with engineer name
    const historyEntry: AttendanceHistoryItem = {
      id: `HIST-${Date.now()}`,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      engineerName: currentUser?.name || currentUser?.username || 'Engineer',
      engineerUsername: currentUser?.username || 'user',
      opnumber,
      sitename,
      epm,
      asgdate1,
      asgdate2,
      jobAssignments: asgjob.map(j => JOB_ASSIGNMENTS.find(item => item.value === j)?.label || j),
      actstatus: actstatus === '1' ? 'Done' : 'In Progress',
      summary,
      submissionStatus: serverSuccess ? 'SUCCESS' : 'SUBMITTED_LOCAL',
    };

    setHistory(prev => [historyEntry, ...prev]);
    setIsSubmitting(false);

    setSubmitFeedback({
      type: 'success',
      message: serverSuccess
        ? 'Laporan harian berhasil dikirim ke portal iCare LT Integra!'
        : 'Laporan tersimpan di riwayat lokal. Anda juga dapat menggunakan tombol "Submit Langsung ke Tab iCare" untuk verifikasi instan di portal.',
    });
  };

  // Direct Submit via hidden form to open iCare in new tab
  const handleDirectPostToIcare = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://icare.lt-integra.com/daily_report/input.php';
    form.target = '_blank';

    const addInput = (name: string, value: string) => {
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = name;
      inp.value = value;
      form.appendChild(inp);
    };

    addInput('opnumber', opnumber);
    addInput('sitename', sitename);
    addInput('epm', epm);
    addInput('asgdate1', asgdate1);
    addInput('asgdate2', asgdate2);
    asgproject.forEach(p => addInput('asgproject[]', p));
    if (actdeploy) addInput('actdeploy', actdeploy);
    asgjob.forEach(j => addInput('asgjob[]', j));
    addInput('actstatus', actstatus);
    addInput('techissue', techissue);
    addInput('troubleticket', troubleticket);
    addInput('summary', summary);
    addInput('session', sessionToken);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '18px 20px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Absen iCare Daily Report
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Laporan aktivitas kerja harian terhubung portal iCare LT Integra dengan template otomatis
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '2px' }}>
          <button
            onClick={() => setActiveTab('form')}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: 'none',
              fontSize: '0.78rem', fontWeight: activeTab === 'form' ? 600 : 400,
              backgroundColor: activeTab === 'form' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'form' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
            }}
          >
            <FileText size={13} /> Formulir
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: 'none',
              fontSize: '0.78rem', fontWeight: activeTab === 'templates' ? 600 : 400,
              backgroundColor: activeTab === 'templates' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'templates' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
            }}
          >
            <Bookmark size={13} /> Template ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: 'none',
              fontSize: '0.78rem', fontWeight: activeTab === 'history' ? 600 : 400,
              backgroundColor: activeTab === 'history' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
            }}
          >
            <History size={13} /> Riwayat ({history.length})
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {submitFeedback && (
        <div style={{
          padding: '14px 18px', borderRadius: '10px',
          backgroundColor: submitFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: submitFeedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          color: submitFeedback.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.85rem', fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {submitFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{submitFeedback.message}</span>
          </div>
          <button
            onClick={() => setSubmitFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main View Mode */}
      {activeTab === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px', alignItems: 'start' }}>
          {/* Main Form Column */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
          }}>
            {/* User Identity & OP Confirmation Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: opnumber && opnumber.length === 4 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.12)',
              border: opnumber && opnumber.length === 4 ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(245, 158, 11, 0.35)',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  backgroundColor: opnumber && opnumber.length === 4 ? '#3b82f6' : '#f59e0b',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.82rem'
                }}>
                  {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Pelapor: <strong>{currentUser?.name || currentUser?.username || 'Engineer'}</strong></span>
                    <span style={{ fontSize: '0.74rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      @{currentUser?.username || 'user'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {sessionToken ? '✅ Sesi iCare OTRS aktif terpasang' : 'ℹ️ Sesi iCare lokal / manual'} • Laporan akan dicatat atas nama OP di bawah ini
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nomor OP Anda:</span>
                <span style={{
                  padding: '3px 10px', borderRadius: '6px',
                  backgroundColor: opnumber && opnumber.length === 4 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                  color: opnumber && opnumber.length === 4 ? '#3b82f6' : '#d97706',
                  fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-mono)'
                }}>
                  {opnumber && opnumber.length === 4 ? `OP${opnumber}` : '⚠️ Belum Lengkap'}
                </span>
              </div>
            </div>

            {/* Quick Template Picker Bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: '12px',
              backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
              marginBottom: '20px', flexWrap: 'wrap', gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pilih Template Cepat:
                </span>
                <select
                  value={selectedTemplateId}
                  onChange={e => {
                    const tpl = templates.find(t => t.id === e.target.value);
                    if (tpl) applyTemplate(tpl);
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)', fontSize: '0.8rem', maxWidth: '280px'
                  }}
                >
                  <option value="">-- Pilih Template Tersimpan --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.templateName} {t.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                title="Simpan isian form ini sebagai template baru"
              >
                <Save size={13} /> Simpan Jadi Template
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmitAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Row 1: OP & Site Name */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min(100%, 140px), 140px) 1fr', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      OP* (4 Digit)
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {opnumber.length}/4
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={4}
                    maxLength={4}
                    placeholder="0899 / 0968"
                    value={opnumber}
                    onChange={e => handleOpChange(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: opnumber.length === 4 ? '1px solid var(--border-subtle)' : '1px solid #f59e0b',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600,
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Tersimpan otomatis per akun
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Site Name
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: BSI Wisma Atlet / Menara Thamrin"
                    value={sitename}
                    onChange={e => setSitename(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Project Manager & Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Project Manager*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Project Manager"
                    value={epm}
                    onChange={e => setEpm(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Date of Assignment (Mulai)
                  </label>
                  <input
                    type="date"
                    value={asgdate1}
                    onChange={e => setAsgdate1(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Date of Assignment (Sampai)
                  </label>
                  <input
                    type="date"
                    value={asgdate2}
                    onChange={e => setAsgdate2(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Project Assignment & Deployment Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Project Assignment
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {PROJECT_ASSIGNMENTS.map(pa => {
                      const selected = asgproject.includes(pa.value);
                      return (
                        <button
                          key={pa.value}
                          type="button"
                          onClick={() => toggleProjectAssignment(pa.value)}
                          style={{
                            padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem',
                            border: selected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            backgroundColor: selected ? 'var(--accent-glow)' : 'var(--bg-primary)',
                            color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: selected ? 600 : 400, cursor: 'pointer'
                          }}
                        >
                          {pa.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Deployment Activity
                  </label>
                  <select
                    value={actdeploy}
                    onChange={e => setActdeploy(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  >
                    <option value="">-- Tidak Ada / Opsional --</option>
                    {DEPLOYMENT_ACTIVITIES.map(da => (
                      <option key={da.value} value={da.value}>{da.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Job Assignment (Pilihan resmi) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Job Assignment* (Pilih aktivitas yang dikerjakan)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))', gap: '6px' }}>
                  {JOB_ASSIGNMENTS.map(ja => {
                    const selected = asgjob.includes(ja.value);
                    return (
                      <button
                        key={ja.value}
                        type="button"
                        onClick={() => toggleJobAssignment(ja.value)}
                        style={{
                          padding: '7px 10px', borderRadius: '6px', fontSize: '0.74rem', textAlign: 'left',
                          border: selected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          backgroundColor: selected ? 'var(--accent-glow)' : 'var(--bg-primary)',
                          color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontWeight: selected ? 600 : 400, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ja.label}</span>
                        {selected && <Check size={13} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Activity Status & Any Technical Issue */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Activity Status*
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setActstatus('1')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: actstatus === '1' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                        backgroundColor: actstatus === '1' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                        color: actstatus === '1' ? '#10b981' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={16} /> 1. Done
                    </button>
                    <button
                      type="button"
                      onClick={() => setActstatus('2')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: actstatus === '2' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                        backgroundColor: actstatus === '2' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary)',
                        color: actstatus === '2' ? '#3b82f6' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <Clock size={16} /> 2. In Progress
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Any Technical Issue*
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setTechissue('NO')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: techissue === 'NO' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                        backgroundColor: techissue === 'NO' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                        color: techissue === 'NO' ? '#10b981' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer'
                      }}
                    >
                      NO (Lancar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTechissue('YES')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: techissue === 'YES' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                        backgroundColor: techissue === 'YES' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-primary)',
                        color: techissue === 'YES' ? '#ef4444' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer'
                      }}
                    >
                      YES (Ada Kendala)
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 6: Trouble Ticket */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Trouble Ticket (Jika ada, masukkan nomor tiket CARE/OTRS)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 2026090322000059 atau 1111111"
                  value={troubleticket}
                  onChange={e => setTroubleticket(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Row 7: Report Summary */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Report Summary* (Ringkasan Aktivitas Kerja)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Deskripsikan pekerjaan, hasil pengecekan sistem, troubleshooting, atau koordinasi yang dilakukan..."
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical', lineHeight: 1.5
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '12px', marginTop: '10px', paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyFormattedWA}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedWA ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    {copiedWA ? 'Tersalin!' : 'Salin Format WA/Chat'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectPostToIcare}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Buka dan post form langsung ke tab portal resmi iCare"
                  >
                    <ExternalLink size={14} /> Submit Langsung ke Tab iCare
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}
                >
                  {isSubmitting ? <RefreshCw size={15} className="spin-icon" /> : <Send size={15} />}
                  {isSubmitting ? 'Mengirim...' : 'Kirim Absen Sekarang'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Sidebar: Session Token & Quick Templates List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Session Token Card */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)', borderRadius: '14px',
              border: '1px solid var(--border-subtle)', padding: '18px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                iCare Session Key
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                Token sesi aktif akun iCare LT Integra untuk autentikasi pelaporan
              </p>
              <input
                type="text"
                value={sessionToken}
                onChange={e => {
                  setSessionToken(e.target.value);
                  if (typeof window !== 'undefined') localStorage.setItem(SESSION_STORAGE_KEY, e.target.value);
                }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: '0.74rem', fontFamily: 'var(--font-mono)'
                }}
              />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Disimpan otomatis di browser lokal Anda.
              </div>
            </div>

            {/* Saved Templates Quick List */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)', borderRadius: '14px',
              border: '1px solid var(--border-subtle)', padding: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Template Cepat
                </span>
                <button
                  onClick={() => setIsSaveTemplateModalOpen(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Simpan Baru
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {templates.map(t => (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 12px', borderRadius: '8px',
                      backgroundColor: selectedTemplateId === t.id ? 'var(--accent-glow)' : 'var(--bg-primary)',
                      border: selectedTemplateId === t.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                        {t.templateName}
                      </div>
                      {t.isDefault && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 600 }}>
                          Default
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      OP {t.opnumber} • {t.sitename.split('(')[0]}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button
                        onClick={() => applyTemplate(t)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.7rem', flex: 1 }}
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Management Tab */}
      {activeTab === 'templates' && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                Daftar Template Absen Tersimpan
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Gunakan template ini untuk mengisi laporan harian dengan cepat tanpa mengetik ulang
              </p>
            </div>
            <button
              onClick={() => setIsSaveTemplateModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={13} /> Simpan Form Saat Ini Jadi Template
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {templates.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '18px', borderRadius: '12px',
                  backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {item.templateName}
                    </div>
                    {item.isDefault ? (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 600 }}>
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefaultTemplate(item.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}
                        title="Atur sebagai template default saat buka halaman"
                      >
                        Set Default
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    <div><strong>OP:</strong> {item.opnumber}</div>
                    <div><strong>Site:</strong> {item.sitename}</div>
                    <div><strong>PM:</strong> {item.epm}</div>
                    <div><strong>Status:</strong> {item.actstatus === '1' ? 'Done' : 'In Progress'}</div>
                    <div style={{
                      marginTop: '6px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)',
                      fontSize: '0.74rem', color: 'var(--text-muted)', maxHeight: '60px', overflow: 'hidden'
                    }}>
                      {item.summary}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <button
                    onClick={() => applyTemplate(item)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, fontSize: '0.76rem' }}
                  >
                    Gunakan Template Ini
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(item.id, item.templateName)}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '5px 10px' }}
                    title="Hapus template"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                Riwayat Pengiriman Absen
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Log pengisian laporan harian engineer yang disimpan di perangkat lokal
              </p>
            </div>

            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Bersihkan seluruh riwayat absen lokal?')) {
                    setHistory([]);
                  }
                }}
                className="btn btn-outline btn-sm"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '0.75rem' }}
              >
                Hapus Riwayat
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada riwayat absen yang disubmit.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 18px', borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        OP {item.opnumber} • {item.sitename}
                      </span>
                      {item.engineerName && (
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                          backgroundColor: 'var(--accent-primary-light)',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                          border: '1px solid rgba(99, 102, 241, 0.25)'
                        }}>
                          👤 {item.engineerName}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                        backgroundColor: item.submissionStatus === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: item.submissionStatus === 'SUCCESS' ? '#10b981' : '#3b82f6',
                        fontWeight: 600
                      }}>
                        {item.submissionStatus === 'SUCCESS' ? 'Terkirim iCare' : 'Tersimpan Lokal'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      PM: {item.epm} • Tanggal: {item.asgdate1} • Status: {item.actstatus}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '6px' }}>
                      {item.summary}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {item.submittedAt} WIB
                    </div>
                    <button
                      onClick={() => {
                        setOpnumber(item.opnumber);
                        setSitename(item.sitename);
                        setEpm(item.epm);
                        setSummary(item.summary);
                        setActiveTab('form');
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: '8px', fontSize: '0.72rem', padding: '3px 8px' }}
                    >
                      Gunakan Data Ini
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Simpan Template */}
      {isSaveTemplateModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            width: '100%', maxWidth: '480px',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Simpan Sebagai Template Absen
              </h3>
              <button
                onClick={() => setIsSaveTemplateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAsTemplate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Nama Template *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Rutin BSI Landmark, Onsite PM DC Surabaya"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{
                padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)',
                fontSize: '0.75rem', color: 'var(--text-secondary)'
              }}>
                <div><strong>Ringkasan Isian yang Disimpan:</strong></div>
                <div style={{ marginTop: '4px' }}>• OP: {opnumber}</div>
                <div>• Site: {sitename}</div>
                <div>• PM: {epm}</div>
                <div>• Status: {actstatus === '1' ? 'Done' : 'In Progress'}</div>
                <div>• Summary: {summary.slice(0, 70)}...</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateModalOpen(false)}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
