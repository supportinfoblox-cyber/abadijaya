'use client';

import { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Save,
  Radio,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export default function IntegrationManagementView() {
  const {
    integrationConfig,
    updateIntegrationConfig,
    testIntegrationConnection,
    syncTicketsNow,
    syncLogs,
    isSyncing,
    can,
  } = useTicketOps();

  const [formConfig, setFormConfig] = useState(integrationConfig);
  const [showSecret, setShowSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState(false);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testIntegrationConnection();
      setTestResult(res);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateIntegrationConfig(formConfig);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 3000);
  };

  if (!can('integration')) {
    return (
      <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', width: '48px', height: '48px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={24} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Access Restricted: Administrator Only
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '450px', margin: '8px auto 0 auto' }}>
          Per PRD Section 7 & 8, Portal Integration configuration, secret keys, and sync strategies can only be managed by Administrators.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Status Banner */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-purple-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-purple)',
            }}>
              <Cpu size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  External Ticket Portal Integration (PRD Section 16, 17, 23)
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: integrationConfig.connectionStatus === 'CONNECTED' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  color: integrationConfig.connectionStatus === 'CONNECTED' ? 'var(--color-success)' : 'var(--color-danger)',
                  border: `1px solid ${integrationConfig.connectionStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                }}>
                  {integrationConfig.connectionStatus}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Active Provider: <strong>{integrationConfig.providerName}</strong> &bull; Abstraction Layer: REST API Inbound & Outbound Sync
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="btn btn-outline btn-sm"
            >
              <Radio size={14} className={testingConnection ? 'animate-pulse' : ''} />
              <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={() => syncTicketsNow()}
              disabled={isSyncing}
              className="btn btn-primary btn-sm"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Trigger Full Sync'}</span>
            </button>
          </div>
        </div>

        {/* Test Result Callout */}
        {testResult && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: testResult.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{testResult.message} ({testResult.latencyMs}ms)</span>
          </div>
        )}

        {saveMessage && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-purple-bg)',
            color: 'var(--color-purple)',
            fontSize: '0.825rem',
          }}>
            Integration configuration updated and saved securely.
          </div>
        )}
      </div>

      {/* Configuration Form (PRD Section 23) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Provider Connection & Secret Management
        </h4>

        <form onSubmit={handleSave}>
          <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Provider Name</label>
              <input
                type="text"
                value={formConfig.providerName}
                onChange={e => setFormConfig({ ...formConfig, providerName: e.target.value })}
                className="form-control"
                placeholder="e.g. ServiceNow ITSM, Jira Service Management, BMC Helix"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Authentication Type</label>
              <select
                value={formConfig.authType}
                onChange={e => setFormConfig({ ...formConfig, authType: e.target.value as any })}
                className="form-control"
              >
                <option value="BEARER_TOKEN">Bearer Token (OAuth 2.0)</option>
                <option value="API_KEY">API Key Header (X-API-Key)</option>
                <option value="BASIC_AUTH">HTTP Basic Authentication</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Portal UI Base URL</label>
              <input
                type="url"
                value={formConfig.portalUrl}
                onChange={e => setFormConfig({ ...formConfig, portalUrl: e.target.value })}
                className="form-control"
                placeholder="https://company.service-now.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">REST API Endpoint URL</label>
              <input
                type="url"
                value={formConfig.apiUrl}
                onChange={e => setFormConfig({ ...formConfig, apiUrl: e.target.value })}
                className="form-control"
                placeholder="https://company.service-now.com/api/now/table/incident"
                required
              />
            </div>

            {/* Secret Key Input with Masking */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>API Secret Token / Client Secret</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Encrypted at Rest</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={formConfig.apiKeyOrToken}
                  onChange={e => setFormConfig({ ...formConfig, apiKeyOrToken: e.target.value })}
                  className="form-control"
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Scheduled Automatic Sync Interval</label>
              <select
                value={formConfig.syncIntervalMinutes}
                onChange={e => setFormConfig({ ...formConfig, syncIntervalMinutes: Number(e.target.value) })}
                className="form-control"
              >
                <option value={5}>Every 5 Minutes (Real-time)</option>
                <option value={10}>Every 10 Minutes</option>
                <option value={15}>Every 15 Minutes (Recommended)</option>
                <option value={30}>Every 30 Minutes</option>
                <option value={60}>Every 1 Hour</option>
              </select>
            </div>
          </div>

          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            marginBottom: '16px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}>
            <strong style={{ color: 'var(--color-warning)' }}>PRD Security Guideline (Section 23 & 26):</strong> Production credentials must never be committed to source repositories or logged to unencrypted outputs. All outbound synchronizations use encrypted HTTP TLS 1.3 tunnels.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={15} />
              Save Integration Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Sync Execution Logs (PRD Section 23) */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
          Recent Synchronizations & Audit Logs ({syncLogs.length})
        </h4>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Records</th>
                <th>Message</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleTimeString()} &bull; {new Date(log.timestamp).toLocaleDateString()}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: log.direction === 'INBOUND' ? 'var(--color-info)' : 'var(--color-purple)',
                    }}>
                      {log.direction === 'INBOUND' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      {log.direction}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: log.status === 'SUCCESS' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                      color: log.status === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{log.recordsCount}</td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {log.message}
                    {log.errorDetail && (
                      <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '2px' }}>
                        Error: {log.errorDetail}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
