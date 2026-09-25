'use client';

import { useState, useEffect } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { MainCategory, TechnicalCategory, TicketPriority } from '@/types';
import { analyzeTicketWithRuleEngine } from '@/services/ruleEngine';
import { X, Sparkles, Plus } from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const { createTicket, users } = useTicketOps();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [mainCategory, setMainCategory] = useState<MainCategory>('Incident');
  const [technicalCategory, setTechnicalCategory] = useState<TechnicalCategory>('Network');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [requester, setRequester] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const assignmentGroup = 'Network Infrastructure Tier-2';
  
  const [ruleRecommendation, setRuleRecommendation] = useState<any>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Run Rule Engine as subject/description updates
  useEffect(() => {
    if (subject.trim().length > 3 || description.trim().length > 10) {
      const result = analyzeTicketWithRuleEngine(subject, description);
      setRuleRecommendation(result);
      if (!isManualOverride) {
        setMainCategory(result.mainCategory);
        setTechnicalCategory(result.technicalCategory);
        setPriority(result.priority);
      }
    } else {
      setRuleRecommendation(null);
    }
  }, [subject, description, isManualOverride]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMsg('Subject is required');
      return;
    }

    const targetUser = users.find(u => u.id === assigneeId);

    const res = createTicket({
      subject,
      description,
      mainCategory,
      technicalCategory,
      priority,
      requester: requester.trim() || 'Internal Requester',
      requesterEmail: requesterEmail.trim() || 'requester@internal.corp',
      assigneeId: targetUser?.id,
      assigneeName: targetUser?.name,
      assignmentGroup,
    });

    if (res.success) {
      // Reset
      setSubject('');
      setDescription('');
      setIsManualOverride(false);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to create ticket');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '720px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Create New Operational Ticket
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Integrated ticket intake with real-time Rule Engine classification
            </p>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-icon" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                fontSize: '0.825rem',
              }}>
                {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Ticket Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Masukkan judul atau deskripsi permohonan tiket..."
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description & Error Logs</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide symptoms, error codes, affected hosts, or specific requests..."
                className="form-control"
                style={{ minHeight: '90px' }}
                required
              />
            </div>

            {/* Rule Engine Suggestion Banner */}
            {ruleRecommendation && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-purple-bg)',
                border: '1px solid var(--color-purple-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="var(--color-purple)" />
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-purple)' }}>
                      Rule Engine Suggestion ({ruleRecommendation.confidence}% match)
                    </span>
                  </div>
                  {isManualOverride && (
                    <button
                      type="button"
                      onClick={() => {
                        setMainCategory(ruleRecommendation.mainCategory);
                        setTechnicalCategory(ruleRecommendation.technicalCategory);
                        setPriority(ruleRecommendation.priority);
                        setIsManualOverride(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-purple)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Apply Recommendation
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {ruleRecommendation.explanation}
                </div>
              </div>
            )}

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Main Category</label>
                <select
                  value={mainCategory}
                  onChange={e => {
                    setMainCategory(e.target.value as MainCategory);
                    setIsManualOverride(true);
                  }}
                  className="form-control"
                >
                  <option value="Incident">Incident</option>
                  <option value="Service Request">Service Request</option>
                  <option value="Problem">Problem</option>
                  <option value="Change Request">Change Request</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Technical Domain</label>
                <select
                  value={technicalCategory}
                  onChange={e => {
                    setTechnicalCategory(e.target.value as TechnicalCategory);
                    setIsManualOverride(true);
                  }}
                  className="form-control"
                >
                  <option value="DNS">DNS</option>
                  <option value="DHCP">DHCP</option>
                  <option value="Network">Network</option>
                  <option value="Server">Server</option>
                  <option value="Security">Security</option>
                  <option value="Application">Application</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Database">Database</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  value={priority}
                  onChange={e => {
                    setPriority(e.target.value as TicketPriority);
                    setIsManualOverride(true);
                  }}
                  className="form-control"
                >
                  <option value="CRITICAL">Critical (4h SLA)</option>
                  <option value="HIGH">High (8h SLA)</option>
                  <option value="MEDIUM">Medium (24h SLA)</option>
                  <option value="LOW">Low (72h SLA)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Unassigned (Triage Pool) --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Requester Name</label>
                <input
                  type="text"
                  value={requester}
                  onChange={e => setRequester(e.target.value)}
                  placeholder="e.g. Rachel Adams"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Requester Email</label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={e => setRequesterEmail(e.target.value)}
                  placeholder="e.g. rachel.a@internal.corp"
                  className="form-control"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} />
              Create & Dispatch Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
