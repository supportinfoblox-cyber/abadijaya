'use client';

import React, { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { Clock, Plus, Filter, User as UserIcon, Calendar, CheckCircle, FileText } from 'lucide-react';

export default function WorklogModuleView() {
  const { worklogs, addWorklog, tickets, users, currentUser, can, setSelectedTicket, setCurrentView } = useTicketOps();

  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [description, setDescription] = useState('');
  const [filterUser, setFilterUser] = useState('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalMinutes = worklogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const filteredLogs = worklogs.filter(w => {
    if (filterUser !== 'ALL' && w.userId !== filterUser) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetTicket = tickets.find(t => t.id === selectedTicketId);
    if (!targetTicket) return;

    const res = addWorklog({
      ticketId: targetTicket.id,
      ticketNumber: targetTicket.ticketNumber,
      userId: currentUser.id,
      date,
      startTime,
      endTime,
      description,
      durationMinutes: Number(durationMinutes),
    });

    if (res.success) {
      setDescription('');
      setShowAddForm(false);
      setFeedback('Worklog recorded and synced to operational reporting!');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Row */}
      <div className="grid-cols-4">
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Engineering Hours
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            {totalHours} hrs
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '4px' }}>
            Across {worklogs.length} logged sessions
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Active Logging Engineers
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8', marginTop: '8px' }}>
            {new Set(worklogs.map(w => w.userId)).size} Engineers
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            IT Operations & Engineering
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Avg Duration Per Session
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#06b6d4', marginTop: '8px' }}>
            {worklogs.length > 0 ? Math.round(totalMinutes / worklogs.length) : 0} mins
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Mean investigation & fix time
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {can('updateTicket') ? (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Plus size={16} />
              {showAddForm ? 'Hide Log Form' : 'Record New Worklog'}
            </button>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Viewer mode: Worklog entry restricted
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          fontSize: '0.825rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Add Worklog Form Modal/Card */}
      {showAddForm && can('updateTicket') && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Record Engineering Worklog (PRD Section 13)
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Select Ticket *</label>
                <select
                  value={selectedTicketId}
                  onChange={e => setSelectedTicketId(e.target.value)}
                  className="form-control"
                  required
                >
                  {tickets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.ticketNumber} - {t.subject.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Activity Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (Minutes) *</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Engineer Name</label>
                <input
                  type="text"
                  value={`${currentUser.name} (${currentUser.role.toUpperCase()})`}
                  disabled
                  className="form-control"
                  style={{ opacity: 0.7 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Remediation & Analysis Description *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detail the technical tasks executed, commands run, hardware replaced, or root cause investigated..."
                className="form-control"
                style={{ minHeight: '80px' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save & Synchronize Worklog
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Worklog History Table */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Operational Worklog History
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Integrated engineer timesheets and activity trail
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filter by Engineer:</span>
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="form-control"
              style={{ width: '180px', height: '36px', fontSize: '0.8rem', padding: '6px 10px' }}
            >
              <option value="ALL">All Engineers</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Engineer</th>
                <th>Ticket #</th>
                <th>Duration</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(wl => {
                const targetTkt = tickets.find(t => t.id === wl.ticketId || t.ticketNumber === wl.ticketNumber);
                return (
                  <tr key={wl.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {wl.date}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {wl.startTime} - {wl.endTime}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {wl.userName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {wl.userRole}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: '#818cf8',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (targetTkt) {
                          setSelectedTicket(targetTkt);
                        }
                      }}
                      >
                        {wl.ticketNumber}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8',
                      }}>
                        {wl.durationMinutes} mins
                      </span>
                    </td>
                    <td style={{ maxWidth: '420px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {wl.description}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {targetTkt && (
                        <button
                          onClick={() => setSelectedTicket(targetTkt)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        >
                          View Ticket
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
