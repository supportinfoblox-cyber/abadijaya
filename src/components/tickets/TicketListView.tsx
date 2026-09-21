'use client';

import { useState, useMemo } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { Ticket, TicketPriority, TicketStatus } from '@/types';
import CloseTicketModal from './CloseTicketModal';
import OtrsSyncModal from './OtrsSyncModal';
import ExportTicketsModal from './ExportTicketsModal';
import { exportTicketsToJson } from '@/services/backupJson';

import {
  Search,
  ArrowUpDown,
  X,
  Layers,
  CheckSquare,
  XCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
  Download,
} from 'lucide-react';

export default function TicketListView() {
  const {
    tickets,
    setSelectedTicket,
    activeFilterStatus,
    setActiveFilterStatus,
    globalSearchQuery,
    setGlobalSearchQuery,
    currentUser,
    can,
    activeKriteria,
    setActiveKriteria,
  } = useTicketOps();


  // Local filters
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'priority' | 'sla'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk selection state
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  // Close modal state
  const [closeModalTickets, setCloseModalTickets] = useState<Ticket[] | null>(null);
  // OTRS Sync modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  // Export Tickets modal state
  const [showExportModal, setShowExportModal] = useState(false);


  // Sub-tabs
  const tabs = [
    { id: 'ALL', label: 'All Tickets', count: tickets.length },
    { id: 'MY_TICKETS', label: 'My Tickets', count: tickets.filter(t => t.assigneeId === currentUser.id).length },
    { id: 'OPEN', label: 'Open', count: tickets.filter(t => t.status === 'OPEN').length },
    { id: 'IN PROGRESS', label: 'In Progress', count: tickets.filter(t => t.status === 'IN PROGRESS').length },
    { id: 'PENDING', label: 'Pending', count: tickets.filter(t => t.status === 'PENDING').length },
    { id: 'RESOLVED', label: 'Resolved', count: tickets.filter(t => t.status === 'RESOLVED').length },
    { id: 'CLOSED', label: 'Closed', count: tickets.filter(t => t.status === 'CLOSED').length },
    { id: 'OVERDUE', label: 'Overdue / Breached', count: tickets.filter(t => t.slaStatus === 'BREACHED' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length },
  ];

  // Kriteria counts for quick filtering
  const kriteriaCounts = useMemo(() => {
    return {
      ALL: tickets.length,
      IPAM: tickets.filter(t => t.kriteria === 'IPAM').length,
      RESERVE_IP: tickets.filter(t => t.kriteria === 'Reserve IP').length,
      DNS_REQUEST: tickets.filter(t => t.kriteria === 'DNS Request').length,
      DNS_A_RECORD: tickets.filter(t => t.kriteria === 'DNS Request' && t.subKriteria?.includes('A Record')).length,
      DNS_CNAME: tickets.filter(t => t.kriteria === 'DNS Request' && t.subKriteria?.includes('CNAME')).length,
      DRP: tickets.filter(t => t.kriteria === 'DRP').length,
      OTHER: tickets.filter(t => t.kriteria === 'Other').length,
    };
  }, [tickets]);

  // Filtering & Sorting Logic
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // 1. Tab Status Filter
      if (activeFilterStatus === 'MY_TICKETS') {
        if (ticket.assigneeId !== currentUser.id) return false;
      } else if (activeFilterStatus === 'OVERDUE') {
        if (ticket.slaStatus !== 'BREACHED' || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
          return false;
        }
      } else if (activeFilterStatus !== 'ALL') {
        if (ticket.status !== activeFilterStatus) return false;
      }

      // 2. Kriteria Filter (IPAM, Reserve IP, DNS Request, DRP, Other)
      if (activeKriteria !== 'ALL') {
        if (activeKriteria === 'DNS Request') {
          if (ticket.kriteria !== 'DNS Request') return false;
        } else if (activeKriteria === 'Reserve IP') {
          if (ticket.kriteria !== 'Reserve IP') return false;
        } else if (activeKriteria === 'IPAM') {
          if (ticket.kriteria !== 'IPAM') return false;
        } else if (activeKriteria === 'DRP') {
          if (ticket.kriteria !== 'DRP') return false;
        } else if (activeKriteria === 'A Record') {
          if (ticket.kriteria !== 'DNS Request' || !ticket.subKriteria?.includes('A Record')) return false;
        } else if (activeKriteria === 'CNAME') {
          if (ticket.kriteria !== 'DNS Request' || !ticket.subKriteria?.includes('CNAME')) return false;
        } else if (activeKriteria === 'Other') {
          if (ticket.kriteria !== 'Other') return false;
        } else {
          if (ticket.kriteria !== activeKriteria) return false;
        }
      }

      // 3. Priority Filter
      if (selectedPriority !== 'ALL' && ticket.priority !== selectedPriority) {
        return false;
      }

      // 4. Category Filter
      if (selectedCategory !== 'ALL' && ticket.mainCategory !== selectedCategory) {
        return false;
      }

      // 5. Technical Category Filter
      if (selectedTech !== 'ALL' && ticket.technicalCategory !== selectedTech) {
        return false;
      }

      // 6. Search Query (Ticket #, Subject, Description, Requester, Assignee, Kriteria, Domain)
      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase().trim();
        const matchesNum = String(ticket.ticketNumber || '').toLowerCase().includes(query);
        const matchesExt = String(ticket.externalId || '').toLowerCase().includes(query);
        const matchesSubject = String(ticket.subject || '').toLowerCase().includes(query);
        const matchesDesc = String(ticket.description || '').toLowerCase().includes(query);
        const matchesReq = String(ticket.requester || '').toLowerCase().includes(query);
        const matchesAssignee = String(ticket.assigneeName || '').toLowerCase().includes(query);
        const matchesKriteria = String(ticket.kriteria || '').toLowerCase().includes(query);
        const matchesSubKriteria = String(ticket.subKriteria || '').toLowerCase().includes(query);
        const matchesDomain = String(ticket.technicalCategory || '').toLowerCase().includes(query);
        const matchesCategory = String(ticket.mainCategory || '').toLowerCase().includes(query);

        if (
          !matchesNum &&
          !matchesExt &&
          !matchesSubject &&
          !matchesDesc &&
          !matchesReq &&
          !matchesAssignee &&
          !matchesKriteria &&
          !matchesSubKriteria &&
          !matchesDomain &&
          !matchesCategory
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'updatedAt') {
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === 'priority') {
        const pWeight: Record<TicketPriority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        comparison = pWeight[b.priority] - pWeight[a.priority];
      } else if (sortBy === 'sla') {
        const sWeight: Record<Ticket['slaStatus'], number> = { BREACHED: 4, CRITICAL: 3, WARNING: 2, SAFE: 1 };
        comparison = sWeight[b.slaStatus] - sWeight[a.slaStatus];
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [
    tickets,
    activeFilterStatus,
    activeKriteria,
    selectedPriority,
    selectedCategory,
    selectedTech,
    globalSearchQuery,
    sortBy,
    sortOrder,
    currentUser.id,
  ]);

  const getPriorityBadgeClass = (priority: TicketPriority) => {
    switch (priority) {
      case 'CRITICAL': return 'badge-priority-critical';
      case 'HIGH': return 'badge-priority-high';
      case 'MEDIUM': return 'badge-priority-medium';
      case 'LOW': return 'badge-priority-low';
    }
  };

  const getStatusBadgeClass = (status: TicketStatus) => {
    switch (status) {
      case 'NEW': return 'badge-status-new';
      case 'OPEN': return 'badge-status-open';
      case 'IN PROGRESS': return 'badge-status-in-progress';
      case 'PENDING': return 'badge-status-pending';
      case 'RESOLVED': return 'badge-status-resolved';
      case 'CLOSED': return 'badge-status-closed';
    }
  };

  const getSLABadgeClass = (sla: Ticket['slaStatus']) => {
    switch (sla) {
      case 'SAFE': return 'badge-sla-safe';
      case 'WARNING': return 'badge-sla-warning';
      case 'CRITICAL': return 'badge-sla-critical';
      case 'BREACHED': return 'badge-sla-breached';
    }
  };

  const getKriteriaBadge = (kriteria?: string, subKriteria?: string) => {
    if (!kriteria) {
      return (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>General</span>
      );
    }
    let bg = 'rgba(99, 102, 241, 0.12)';
    let border = 'rgba(99, 102, 241, 0.35)';
    let text = 'var(--accent-primary)';

    if (kriteria === 'IPAM') {
      bg = 'rgba(16, 185, 129, 0.12)';
      border = 'rgba(16, 185, 129, 0.35)';
      text = 'var(--color-success)';
    } else if (kriteria === 'Reserve IP') {
      bg = 'rgba(245, 158, 11, 0.12)';
      border = 'rgba(245, 158, 11, 0.35)';
      text = 'var(--color-warning)';
    } else if (kriteria === 'DRP') {
      bg = 'rgba(168, 85, 247, 0.12)';
      border = 'rgba(168, 85, 247, 0.35)';
      text = '#a855f7';
    } else if (kriteria === 'DNS Request') {
      bg = 'rgba(59, 130, 246, 0.12)';
      border = 'rgba(59, 130, 246, 0.35)';
      text = 'var(--color-info)';
    } else if (kriteria === 'Other') {
      bg = 'rgba(148, 163, 184, 0.12)';
      border = 'rgba(148, 163, 184, 0.35)';
      text = 'var(--text-secondary)';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '9999px',
          backgroundColor: bg,
          border: `1px solid ${border}`,
          color: text,
          width: 'fit-content',
        }}>
          {kriteria}
        </span>
        {subKriteria && (
          <span
            style={{
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={subKriteria}
          >
            {subKriteria}
          </span>
        )}
      </div>
    );
  };

  const resetFilters = () => {
    setSelectedPriority('ALL');
    setSelectedCategory('ALL');
    setSelectedTech('ALL');
    setActiveKriteria('ALL');
    setGlobalSearchQuery('');
    setActiveFilterStatus('ALL');
  };

  const hasActiveFilters =
    selectedPriority !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedTech !== 'ALL' ||
    activeKriteria !== 'ALL' ||
    globalSearchQuery !== '' ||
    activeFilterStatus !== 'ALL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Kriteria Filter Bar (User criteria: IPAM, Reserve IP, DNS Request, DRP) */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '12px 18px',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
          <Layers size={15} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Kriteria Tiket:
          </span>
        </div>

        {/* Semua Kriteria */}
        <button
          onClick={() => setActiveKriteria('ALL')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            border: activeKriteria === 'ALL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            backgroundColor: activeKriteria === 'ALL' ? 'var(--accent-glow)' : 'var(--bg-elevated)',
            color: activeKriteria === 'ALL' ? 'var(--accent-primary)' : 'var(--text-secondary)'
          }}
        >
          <span>Semua</span>
          <span style={{
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: activeKriteria === 'ALL' ? 'var(--accent-primary)' : 'var(--bg-input)',
            color: activeKriteria === 'ALL' ? '#ffffff' : 'var(--text-secondary)'
          }}>
            {kriteriaCounts.ALL}
          </span>
        </button>

        {/* IPAM */}
        <button
          onClick={() => setActiveKriteria('IPAM')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            border: activeKriteria === 'IPAM' ? '1px solid var(--color-success)' : '1px solid var(--border-subtle)',
            backgroundColor: activeKriteria === 'IPAM' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-elevated)',
            color: activeKriteria === 'IPAM' ? 'var(--color-success)' : 'var(--text-secondary)'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></span>
          <span>IPAM</span>
          <span style={{
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--color-success)',
            fontWeight: 700
          }}>
            {kriteriaCounts.IPAM}
          </span>
        </button>

        {/* Reserve IP */}
        <button
          onClick={() => setActiveKriteria('Reserve IP')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            border: activeKriteria === 'Reserve IP' ? '1px solid var(--color-warning)' : '1px solid var(--border-subtle)',
            backgroundColor: activeKriteria === 'Reserve IP' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
            color: activeKriteria === 'Reserve IP' ? 'var(--color-warning)' : 'var(--text-secondary)'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}></span>
          <span>Reserve IP</span>
          <span style={{
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--color-warning)',
            fontWeight: 700
          }}>
            {kriteriaCounts.RESERVE_IP}
          </span>
        </button>

        {/* DNS Request */}
        <button
          onClick={() => setActiveKriteria('DNS Request')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            border: activeKriteria === 'DNS Request' ? '1px solid var(--color-info)' : '1px solid var(--border-subtle)',
            backgroundColor: activeKriteria === 'DNS Request' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-elevated)',
            color: activeKriteria === 'DNS Request' ? 'var(--color-info)' : 'var(--text-secondary)'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-info)' }}></span>
          <span>DNS Request</span>
          <span style={{
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            color: 'var(--color-info)',
            fontWeight: 700
          }}>
            {kriteriaCounts.DNS_REQUEST}
          </span>
        </button>

        {/* DNS Sub-filter: A Record */}
        <button
          onClick={() => setActiveKriteria('A Record')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            border: activeKriteria === 'A Record' ? '1px solid var(--color-info)' : '1px dashed var(--border-subtle)',
            backgroundColor: activeKriteria === 'A Record' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
            color: activeKriteria === 'A Record' ? 'var(--text-primary)' : 'var(--color-info)'
          }}
        >
          <span>&bull; A Record</span>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', opacity: 0.85 }}>({kriteriaCounts.DNS_A_RECORD})</span>
        </button>

        {/* DNS Sub-filter: CNAME */}
        <button
          onClick={() => setActiveKriteria('CNAME')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            border: activeKriteria === 'CNAME' ? '1px solid var(--color-info)' : '1px dashed var(--border-subtle)',
            backgroundColor: activeKriteria === 'CNAME' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
            color: activeKriteria === 'CNAME' ? 'var(--text-primary)' : 'var(--color-info)'
          }}
        >
          <span>&bull; CNAME</span>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', opacity: 0.85 }}>({kriteriaCounts.DNS_CNAME})</span>
        </button>

        {/* DRP */}
        <button
          onClick={() => setActiveKriteria('DRP')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            border: activeKriteria === 'DRP' ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
            backgroundColor: activeKriteria === 'DRP' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-elevated)',
            color: activeKriteria === 'DRP' ? '#a855f7' : 'var(--text-secondary)'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a855f7' }}></span>
          <span>DRP (Standby)</span>
          <span style={{
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            color: '#a855f7',
            fontWeight: 700
          }}>
            {kriteriaCounts.DRP}
          </span>
        </button>

        {/* Other */}
        <button
          onClick={() => setActiveKriteria('Other')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            border: activeKriteria === 'Other' ? '1px solid var(--border-medium)' : '1px solid var(--border-subtle)',
            backgroundColor: activeKriteria === 'Other' ? 'var(--bg-input)' : 'var(--bg-elevated)',
            color: activeKriteria === 'Other' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }}></span>
          <span>Other</span>
          <span style={{
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-secondary)',
            fontWeight: 700
          }}>
            {kriteriaCounts.OTHER}
          </span>
        </button>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
      }}>
        {tabs.map(tab => {
          const isActive = activeFilterStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilterStatus(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                fontWeight: isActive ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.25)' : 'none',
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-input)',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Control Bar (PRD Section 11.2) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by ticket #, subject, requester, assignee..."
              value={globalSearchQuery}
              onChange={e => setGlobalSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
            />
          </div>

          {/* Dropdown Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="form-control"
              style={{ width: '130px', height: '38px', fontSize: '0.8rem', padding: '6px 10px' }}
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Main Category */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="form-control"
              style={{ width: '150px', height: '38px', fontSize: '0.8rem', padding: '6px 10px' }}
            >
              <option value="ALL">All Categories</option>
              <option value="Incident">Incident</option>
              <option value="Service Request">Service Request</option>
              <option value="Problem">Problem</option>
              <option value="Change Request">Change Request</option>
              <option value="Maintenance">Maintenance</option>
            </select>

            {/* Technical Domain */}
            <select
              value={selectedTech}
              onChange={e => setSelectedTech(e.target.value)}
              className="form-control"
              style={{ width: '140px', height: '38px', fontSize: '0.8rem', padding: '6px 10px' }}
            >
              <option value="ALL">All Tech Domains</option>
              <option value="DNS">DNS</option>
              <option value="DHCP">DHCP</option>
              <option value="Network">Network</option>
              <option value="Server">Server</option>
              <option value="Security">Security</option>
              <option value="Application">Application</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Database">Database</option>
            </select>

            {/* Sort Field */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="form-control"
              style={{ width: '140px', height: '38px', fontSize: '0.8rem', padding: '6px 10px' }}
            >
              <option value="createdAt">Sort: Created</option>
              <option value="updatedAt">Sort: Updated</option>
              <option value="priority">Sort: Priority</option>
              <option value="sla">Sort: SLA Risk</option>
            </select>

            {/* Sort Direction Toggle */}
            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="btn btn-outline btn-sm"
              style={{ height: '38px', padding: '0 12px' }}
              title={`Sorting: ${sortOrder.toUpperCase()}`}
            >
              <ArrowUpDown size={15} />
              <span>{sortOrder.toUpperCase()}</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="btn btn-outline btn-sm"
                style={{ height: '38px', color: 'var(--color-danger)' }}
              >
                <X size={14} />
                Reset
              </button>
            )}

            {/* OTRS Live Historical Sync Button */}
            <button
              onClick={() => setShowSyncModal(true)}
              className="btn btn-primary btn-sm"
              style={{
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#4f46e5',
                borderColor: '#6366f1',
              }}
              title="Tarik tiket aktif dan riwayat > 3 bulan langsung dari portal iCare"
            >
              <Download size={15} />
              <span>Tarik Data iCare</span>
            </button>

            {/* Tarik & Export Tiket (Excel & CSV) */}
            <button
              onClick={() => setShowExportModal(true)}
              className="btn btn-primary btn-sm"
              style={{
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#059669',
                borderColor: '#10b981',
                color: '#ffffff',
                boxShadow: '0 2px 10px rgba(5, 150, 105, 0.3)',
                fontWeight: 600,
              }}
              title="Tarik & Export tiket ke Excel (.xlsx) atau CSV dengan rentang waktu kustom atau opsi cepat"
            >
              <FileSpreadsheet size={15} />
              <span>Tarik & Export Data</span>
            </button>

            {/* Backup JSON Button */}
            <button
              onClick={() => exportTicketsToJson(filteredTickets, 'tiket_icare_bsi_backup')}
              className="btn btn-outline btn-sm"
              style={{
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-purple)',
                borderColor: 'var(--color-purple-border)',
                backgroundColor: 'var(--color-purple-bg)',
              }}
              title="Backup seluruh tiket hasil filter saat ini ke format file JSON"
            >
              <FileJson size={15} />
              <span>Backup JSON ({filteredTickets.length})</span>
            </button>


          </div>
        </div>
      </div>

      {/* Bulk Action Floating Bar */}
      {selectedTicketIds.size > 0 && (
        <div style={{
          position: 'sticky',
          top: '12px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'rgba(99, 102, 241, 1)',
          border: '1px solid rgba(165, 180, 252, 0.4)',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
          animation: 'slideDown 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckSquare size={18} color="#ffffff" />
            <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
              {selectedTicketIds.size} tiket terpilih
            </span>
            <button
              onClick={() => {
                // Select all filtered tickets
                const allFilteredIds = filteredTickets
                  .filter(t => t.status !== 'CLOSED')
                  .map(t => t.id);
                if (selectedTicketIds.size === allFilteredIds.length) {
                  setSelectedTicketIds(new Set());
                } else {
                  setSelectedTicketIds(new Set(allFilteredIds));
                }
              }}
              style={{
                fontSize: '0.75rem',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.4)',
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {selectedTicketIds.size === filteredTickets.filter(t => t.status !== 'CLOSED').length
                ? 'Batalkan Semua'
                : `Pilih Semua ${filteredTickets.filter(t => t.status !== 'CLOSED').length} Tiket`}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setShowExportModal(true);
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.4)',
                backgroundColor: '#059669',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Export tiket terpilih ke Excel (.xlsx) atau CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Export Tiket Terpilih ({selectedTicketIds.size})</span>
            </button>

            <button
              onClick={() => {
                const selectedList = filteredTickets.filter(t => selectedTicketIds.has(t.id));
                exportTicketsToJson(selectedList, 'tiket_terpilih_icare_backup');
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.4)',
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Backup tiket terpilih ke file format JSON"
            >
              <FileJson size={15} />
              <span>JSON Terpilih ({selectedTicketIds.size})</span>
            </button>

            <button
              onClick={() => setSelectedTicketIds(new Set())}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <XCircle size={14} />
              <span>Batal</span>
            </button>

            {can('closeTicket') && (
              <button
                onClick={() => {
                  const ticketsToClose = filteredTickets.filter(
                    t => selectedTicketIds.has(t.id) && t.status !== 'CLOSED'
                  );
                  if (ticketsToClose.length > 0) {
                    setCloseModalTickets(ticketsToClose);
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Tutup {selectedTicketIds.size} Tiket Sekaligus</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ticket List Table (PRD Section 11.1) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  {/* Select All Non-Closed Checkbox */}
                  <input
                    type="checkbox"
                    title="Pilih semua tiket aktif"
                    style={{ accentColor: '#6366f1', cursor: 'pointer', width: '16px', height: '16px' }}
                    checked={
                      filteredTickets.filter(t => t.status !== 'CLOSED').length > 0 &&
                      filteredTickets.filter(t => t.status !== 'CLOSED').every(t => selectedTicketIds.has(t.id))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedTicketIds(new Set(
                          filteredTickets.filter(t => t.status !== 'CLOSED').map(t => t.id)
                        ));
                      } else {
                        setSelectedTicketIds(new Set());
                      }
                    }}
                  />
                </th>
                <th>Ticket # / External ID</th>
                <th>Subject & Requester</th>
                <th>Kriteria / Sub-Type</th>
                <th>Category</th>
                <th>Domain</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Created</th>
                <th>SLA Countdown</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      No tickets match the current filter criteria
                    </div>
                    <p style={{ fontSize: '0.85rem' }}>
                      Try clearing search parameters or adjusting your status filters.
                    </p>
                    {hasActiveFilters && (
                      <button onClick={resetFilters} className="btn btn-outline btn-sm" style={{ marginTop: '14px' }}>
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => {
                  const createdDate = new Date(ticket.createdAt);
                  const dueDate = new Date(ticket.dueAt);
                  const isClosedOrResolved = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';
                  const isSelected = selectedTicketIds.has(ticket.id);

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="ticket-row-clickable"
                      style={{
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : undefined,
                        outline: isSelected ? '1px solid rgba(99, 102, 241, 0.35)' : undefined,
                        outlineOffset: '-1px',
                      }}
                    >
                      {/* Checkbox cell */}
                      <td
                        style={{ textAlign: 'center', width: '40px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {!isClosedOrResolved && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const next = new Set(selectedTicketIds);
                              if (e.target.checked) next.add(ticket.id);
                              else next.delete(ticket.id);
                              setSelectedTicketIds(next);
                            }}
                            style={{ accentColor: '#6366f1', cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                        )}
                      </td>
                      {/* Ticket Number */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="ticket-number-chip" style={{ display: 'inline-flex', marginBottom: '3px' }}>
                          {ticket.ticketNumber}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {ticket.externalId}
                        </div>
                      </td>

                      {/* Subject */}
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.85rem',
                        }}>
                          {ticket.subject}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          By: {ticket.requester} &bull; {ticket.assignmentGroup}
                        </div>
                      </td>

                      {/* Kriteria & Sub-Type */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {getKriteriaBadge(ticket.kriteria, ticket.subKriteria)}
                      </td>

                      {/* Main Category */}
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {ticket.mainCategory}
                      </td>

                      {/* Technical Category */}
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                        }}>
                          {ticket.technicalCategory}
                        </span>
                      </td>

                      {/* Priority */}
                      <td>
                        <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        {ticket.status === 'CLOSED' && ticket.closedAt && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px', whiteSpace: 'nowrap' }}>
                            {new Date(ticket.closedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                          </div>
                        )}
                      </td>

                      {/* Assignee */}
                      <td style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                        {ticket.assigneeName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-purple-bg)',
                              color: 'var(--color-purple)',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {ticket.assigneeName.charAt(0)}
                            </div>
                            <span>{ticket.assigneeName}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Created Date (WIB / GMT+7) */}
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                          {!isNaN(createdDate.getTime()) ? createdDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {!isNaN(createdDate.getTime()) ? `${createdDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB` : ''}
                        </div>
                      </td>

                      {/* SLA Status */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge ${getSLABadgeClass(ticket.slaStatus)}`}>
                          {ticket.slaStatus}
                        </span>
                        {!isClosedOrResolved && !isNaN(dueDate.getTime()) && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
                            Due: {dueDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            View Details
                          </button>

                          {can('closeTicket') && !isClosedOrResolved && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setCloseModalTickets([ticket]);
                              }}
                              className="btn btn-sm"
                              title="Tutup tiket ini dan sinkronkan ke iCare OTRS"
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                backgroundColor: 'var(--color-success-bg)',
                                border: '1px solid var(--color-success-border)',
                                color: 'var(--color-success)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Tutup</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Ticket Modal */}
      {closeModalTickets && (
        <CloseTicketModal
          ticketsToClose={closeModalTickets}
          onClose={() => setCloseModalTickets(null)}
          onSuccess={() => {
            setSelectedTicketIds(new Set());
            setCloseModalTickets(null);
          }}
        />
      )}

      {/* OTRS Sync Modal */}
      <OtrsSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />

      {/* Export Tickets Modal (Excel & CSV with Date Range) */}
      <ExportTicketsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        allTickets={tickets}
        defaultSelectedIds={selectedTicketIds.size > 0 ? selectedTicketIds : undefined}
      />
    </div>
  );

}
