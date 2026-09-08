'use client';

import React, { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { analyzeTicketWithRuleEngine } from '@/services/ruleEngine';
import { MainCategory, TechnicalCategory } from '@/types';
import {
  Layers,
  Sparkles,
  Search,
  CheckCircle,
  Cpu,
  Shield,
  Database,
  Globe,
  Server,
  Network,
  Radio,
  FileCode,
} from 'lucide-react';

export default function CategoryRuleEngineView() {
  const { tickets } = useTicketOps();

  // Test sandbox state
  const [testSubject, setTestSubject] = useState('Core BGP router peering dropped after fiber cut in DC-2');
  const [testDescription, setTestDescription] = useState('Interface TenGigE0/1/0/2 down line protocol down. High latency on upstream routes.');

  const testResult = analyzeTicketWithRuleEngine(testSubject, testDescription);

  const mainCategories: { name: MainCategory; desc: string; color: string; count: number }[] = [
    { name: 'Incident', desc: 'Unplanned interruption or reduction in quality of an IT service', color: '#f43f5e', count: tickets.filter(t => t.mainCategory === 'Incident').length },
    { name: 'Service Request', desc: 'Formal request from a user for something to be provided (access, hardware)', color: '#06b6d4', count: tickets.filter(t => t.mainCategory === 'Service Request').length },
    { name: 'Problem', desc: 'Cause or potential cause of one or more recurring incidents', color: '#f59e0b', count: tickets.filter(t => t.mainCategory === 'Problem').length },
    { name: 'Change Request', desc: 'Addition, modification, or removal of anything that could affect IT services', color: '#8b5cf6', count: tickets.filter(t => t.mainCategory === 'Change Request').length },
    { name: 'Maintenance', desc: 'Scheduled preventive work, hardware replacements, and cluster upgrades', color: '#10b981', count: tickets.filter(t => t.mainCategory === 'Maintenance').length },
  ];

  const technicalCategories: { name: TechnicalCategory; icon: any; desc: string; keywords: string[] }[] = [
    { name: 'DNS', icon: Globe, desc: 'Domain name resolution, zone files, BIND, NS, CNAME', keywords: ['dns', 'domain', 'nameserver', 'nslookup', 'cname', 'a record'] },
    { name: 'DHCP', icon: Radio, desc: 'Dynamic host config, IP leases, scope, MAC reservation', keywords: ['dhcp', 'ip lease', 'ip pool', 'scope', 'ip conflict'] },
    { name: 'Network', icon: Network, desc: 'Switches, routers, firewalls, BGP, VLANs, VPNs', keywords: ['network', 'switch', 'router', 'vlan', 'bgp', 'packet loss'] },
    { name: 'Server', icon: Server, desc: 'Linux/Windows OS, CPU spikes, RAM leak, kernel crash', keywords: ['server', 'cpu high', 'memory leak', 'oom', 'kernel panic'] },
    { name: 'Security', icon: Shield, desc: 'SOC alerts, ransomware, malware, CVE vulnerabilities', keywords: ['security', 'breach', 'ransomware', 'firewall', 'vulnerability'] },
    { name: 'Application', icon: FileCode, desc: 'Microservices, APIs, 500 errors, frontend crashes', keywords: ['application', 'api failure', 'frontend crash', 'login failure'] },
    { name: 'Infrastructure', icon: Cpu, desc: 'Datacenter power, UPS, racks, cooling, hypervisors', keywords: ['infrastructure', 'datacenter', 'ups power', 'cooling', 'san storage'] },
    { name: 'Database', icon: Database, desc: 'Postgres, MySQL, deadlocks, slow queries, replica lag', keywords: ['database', 'postgres', 'mysql', 'slow query', 'deadlock'] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Interactive Rule Engine Playground */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Intelligent Ticket Classification Rule Engine (PRD Section 14)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Natural language keyword matching algorithm that analyzes ticket text and predicts category, domain, and priority
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginTop: '16px' }}>
          {/* Input Sandbox */}
          <div>
            <div className="form-group">
              <label className="form-label">Test Ticket Subject</label>
              <input
                type="text"
                value={testSubject}
                onChange={e => setTestSubject(e.target.value)}
                className="form-control"
                placeholder="Type sample ticket title..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Test Ticket Description</label>
              <textarea
                value={testDescription}
                onChange={e => setTestDescription(e.target.value)}
                className="form-control"
                style={{ minHeight: '85px' }}
                placeholder="Type error logs, symptoms, or request details..."
              />
            </div>
          </div>

          {/* Real-time Classification Output Card */}
          <div style={{
            padding: '18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Rule Engine Prediction
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  {testResult.confidence}% Confidence
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Main Category</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#818cf8' }}>
                    {testResult.mainCategory}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px', marginLeft: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Domain</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>
                    {testResult.technicalCategory}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px', marginLeft: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Priority</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: testResult.priority === 'CRITICAL' ? '#f43f5e' : '#fbbf24' }}>
                    {testResult.priority}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
                {testResult.explanation}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                DETECTED TOKENS / KEYWORDS:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {testResult.matchedKeywords.length > 0 ? (
                  testResult.matchedKeywords.map(kw => (
                    <span key={kw} style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      color: '#818cf8',
                    }}>
                      #{kw}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No specific keywords matched (Default fallback applied)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Categories Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          ITIL Main Categories
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {mainCategories.map(cat => (
            <div
              key={cat.name}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderLeft: `4px solid ${cat.color}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {cat.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {cat.count} Active
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {cat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Categories Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Technical Domains & Keyword Dictionary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {technicalCategories.map(tech => {
            const Icon = tech.icon;
            return (
              <div
                key={tech.name}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                    <Icon size={16} />
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {tech.name}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.3 }}>
                  {tech.desc}
                </p>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {tech.keywords.map(kw => (
                    <span key={kw} style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
