'use client';

import { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { UserRole } from '@/types';
import { hashPassword } from '@/lib/passwordHash';
import {
  Users,
  UserPlus,
  KeyRound,
  Check,
  X,
  Lock,
  Trash2,
} from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';

export default function UserManagementView() {
  const { users, addUser, toggleUserActive, deleteUser, can, currentUser } = useTicketOps();

  const [showAddUser, setShowAddUser] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('engineer');
  const [department, setDepartment] = useState('IT Operations');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // RBAC Matrix definition (from PRD Section 8)
  const rbacMatrix = [
    { module: 'Dashboard', admin: true, supervisor: true, engineer: true, viewer: true },
    { module: 'View Ticket', admin: true, supervisor: true, engineer: true, viewer: true },
    { module: 'Update Ticket', admin: true, supervisor: true, engineer: true, viewer: false },
    { module: 'Assign Ticket', admin: true, supervisor: true, engineer: false, viewer: false },
    { module: 'Resolve Ticket', admin: true, supervisor: true, engineer: true, viewer: false },
    { module: 'Close Ticket', admin: true, supervisor: true, engineer: 'Configurable', viewer: false },
    { module: 'Reports', admin: true, supervisor: true, engineer: true, viewer: true },
    { module: 'User Management', admin: true, supervisor: false, engineer: false, viewer: false },
    { module: 'Integration', admin: true, supervisor: false, engineer: false, viewer: false },
    { module: 'Audit Log', admin: true, supervisor: 'Limited', engineer: false, viewer: false },
  ];

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!name.trim() || !email.trim()) return;

    if (!password.trim() || password.trim().length < 8) {
      setErrorMessage('Password awal wajib diisi minimal 8 karakter demi keamanan.');
      return;
    }

    try {
      const hashedPassword = await hashPassword(password.trim());
      const res = addUser({
        name: name.trim(),
        username: username.trim() || email.split('@')[0],
        email: email.trim(),
        role,
        department: department.trim() || 'IT Operations',
        password: hashedPassword,
        isActive: true,
        avatarUrl: '',
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Gagal menambahkan pengguna.');
        return;
      }

      setName('');
      setUsername('');
      setPassword('');
      setEmail('');
      setShowAddUser(false);
      setFeedback(`Pengguna ${name} berhasil didaftarkan sebagai ${role.toUpperCase()}!`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setErrorMessage('Gagal memproses enkripsi password: ' + err.message);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${userName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      const res = deleteUser(userId);
      if (res.success) {
        setFeedback(`Pengguna "${userName}" berhasil dihapus.`);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setErrorMessage(res.error || 'Gagal menghapus pengguna.');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    }
  };

  const handleResetPassword = (targetEmail: string) => {
    setFeedback(`Link reset password sementara telah dikirimkan ke ${targetEmail}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  if (!can('userManagement')) {
    return (
      <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', width: '48px', height: '48px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={24} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Access Restricted: Administrator Only
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '450px', margin: '8px auto 0 auto' }}>
          Per PRD Section 7 & 8, User Management and RBAC configuration can only be accessed by system Administrators.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
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
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                User Management & Access Control (PRD Section 7, 8, 21)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Role-Based Access Control (RBAC) governance, accounts, and system permissions
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="btn btn-primary btn-sm"
          >
            <UserPlus size={16} />
            <span>{showAddUser ? 'Close Form' : 'Provision User'}</span>
          </button>
        </div>

        {feedback && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Check size={16} />
            <span>{feedback}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            color: 'var(--color-danger)',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <X size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Provision User Form */}
      {showAddUser && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Tambah Pengguna Baru (Khusus Administrator)
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Daftarkan user baru untuk tim operasional Anda. Kredensial ini dapat digunakan untuk login ke portal.
          </p>
          <form onSubmit={handleAddUser}>
            <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Ahmad Fauzi"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username Login *</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="form-control"
                  placeholder="e.g. ahmadfauzi"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Perusahaan *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-control"
                  placeholder="e.g. engineer@ticketops.local"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password Awal *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-control"
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Akses (RBAC) *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="form-control"
                >
                  <option value="engineer">Engineer (Resolver - Worklog & Close Tiket)</option>
                  <option value="supervisor">Supervisor (Monitoring & Assignment)</option>
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Departemen / Unit Kerja</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Infoblox DNS/DHCP Engineering"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddUser(false)} className="btn btn-secondary">
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                Simpan & Daftarkan Pengguna
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Roster Table */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
          Registered System Users ({users.length})
        </h4>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Login</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={34} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor:
                        u.role === 'admin'
                          ? 'rgba(99, 102, 241, 0.2)'
                          : u.role === 'supervisor'
                          ? 'rgba(6, 182, 212, 0.2)'
                          : u.role === 'engineer'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(148, 163, 184, 0.2)',
                      color:
                        u.role === 'admin'
                          ? 'var(--color-purple)'
                          : u.role === 'supervisor'
                          ? 'var(--color-info)'
                          : u.role === 'engineer'
                          ? 'var(--color-success)'
                          : 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {u.department}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: u.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: u.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {u.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => handleResetPassword(u.email)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        title="Reset Password"
                      >
                        <KeyRound size={13} />
                        Reset
                      </button>
                      <button
                        onClick={() => toggleUserActive(u.id)}
                        disabled={u.id === currentUser.id || u.id === 'usr-admin' || u.username === 'admin'}
                        className={`btn btn-sm ${u.isActive ? 'btn-outline' : 'btn-success'}`}
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                      {u.id !== currentUser.id && u.id !== 'usr-admin' && u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="btn btn-outline btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            color: 'var(--color-danger)',
                            borderColor: 'rgba(244, 63, 94, 0.3)',
                            backgroundColor: 'rgba(244, 63, 94, 0.08)',
                          }}
                          title="Hapus Pengguna"
                        >
                          <Trash2 size={13} />
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official RBAC Matrix (Directly implementing PRD Section 7.4 & 8) */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Role-Based Access Control (RBAC) Permission Matrix
        </h4>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Standardized access matrix across all system operational modules per PRD specification
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Operational Module</th>
                <th style={{ textAlign: 'center' }}>Admin</th>
                <th style={{ textAlign: 'center' }}>Supervisor</th>
                <th style={{ textAlign: 'center' }}>Engineer</th>
                <th style={{ textAlign: 'center' }}>Viewer</th>
              </tr>
            </thead>
            <tbody>
              {rbacMatrix.map(row => (
                <tr key={row.module}>
                  <td style={{ fontWeight: 600 }}>{row.module}</td>
                  <td style={{ textAlign: 'center' }}>
                    {row.admin ? <Check size={18} color="var(--color-success)" style={{ margin: '0 auto' }} /> : <X size={18} color="var(--color-danger)" style={{ margin: '0 auto' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.supervisor === 'Limited' ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-warning)', fontWeight: 700 }}>Limited</span>
                    ) : row.supervisor ? (
                      <Check size={18} color="var(--color-success)" style={{ margin: '0 auto' }} />
                    ) : (
                      <X size={18} color="var(--color-danger)" style={{ margin: '0 auto' }} />
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.engineer === 'Configurable' ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-purple)', fontWeight: 700 }}>Configurable</span>
                    ) : row.engineer ? (
                      <Check size={18} color="var(--color-success)" style={{ margin: '0 auto' }} />
                    ) : (
                      <X size={18} color="var(--color-danger)" style={{ margin: '0 auto' }} />
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.viewer ? <Check size={18} color="var(--color-success)" style={{ margin: '0 auto' }} /> : <X size={18} color="var(--color-danger)" style={{ margin: '0 auto' }} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
