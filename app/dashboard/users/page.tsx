'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchUsers, createUser, fetchOrganizations } from '../../../lib/api';
import type { UserModel, Organization } from '../../../types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function errorMsg(err: unknown): string {
  const e = err as { message?: string | string[] };
  const m = e.message;
  if (Array.isArray(m)) return m[0];
  return m ?? 'Something went wrong.';
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: isAdmin ? '#eff6ff' : '#f0fdf4',
      color: isAdmin ? '#2563eb' : '#16a34a',
      border: `1px solid ${isAdmin ? '#bfdbfe' : '#bbf7d0'}`,
    }}>
      {isAdmin ? 'Admin' : 'Member'}
    </span>
  );
}

export default function UsersPage() {
  const { isAdmin, loading: authLoading, auth } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserModel[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [organizationId, setOrganizationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard/customers');
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetchUsers(), fetchOrganizations()])
      .then(([u, o]) => { setUsers(u); setOrgs(o); })
      .catch((err) => setError(errorMsg(err)))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  function openForm() {
    setName('');
    setEmail('');
    setRole('member');
    // Default to the admin's own org if available
    setOrganizationId(auth?.user.organizationId ?? '');
    setFormError(null);
    setShowForm(true);
  }

  async function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!organizationId) { setFormError('Please select an organization.'); return; }
    setFormError(null);
    setSaving(true);
    try {
      const user = await createUser({ name, email, role, organizationId });
      setUsers((prev) => [user, ...prev]);
      setShowForm(false);
    } catch (err) {
      setFormError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !isAdmin) return null;

  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Users</h1>
          <p style={styles.pageSubtitle}>{users.length} user{users.length !== 1 ? 's' : ''} across all organizations</p>
        </div>
        <button style={styles.btnPrimary} onClick={openForm}>+ New User</button>
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div style={modal.overlay} onClick={() => setShowForm(false)}>
          <div style={modal.box} onClick={(e) => e.stopPropagation()}>
            <div style={modal.header}>
              <h2 style={modal.title}>Create User</h2>
              <button onClick={() => setShowForm(false)} style={modal.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={modal.form}>
              {/* Organization — shown first, most important for scoping */}
              <div style={field.wrap}>
                <label style={field.label}>Organization <span style={field.required}>*</span></label>
                <select
                  style={inp}
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  required
                >
                  <option value="">— select organization —</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <span style={field.hint}>The user will only see data within this organization.</span>
              </div>

              <div style={field.wrap}>
                <label style={field.label}>Full Name <span style={field.required}>*</span></label>
                <input
                  style={inp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                />
              </div>

              <div style={field.wrap}>
                <label style={field.label}>Email Address <span style={field.required}>*</span></label>
                <input
                  style={inp}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  required
                />
                <span style={field.hint}>Used to sign in — must be unique.</span>
              </div>

              <div style={field.wrap}>
                <label style={field.label}>Role <span style={field.required}>*</span></label>
                <select
                  style={inp}
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                >
                  <option value="member">Member — can create &amp; view assigned customers</option>
                  <option value="admin">Admin — full access to organization data</option>
                </select>
              </div>

              {formError && <div style={styles.errorBox}>{formError}</div>}

              <div style={modal.actions}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.btnSecondary}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Loading…</div>
      ) : users.length === 0 ? (
        <div style={styles.empty}>No users found.</div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Name', 'Email', 'Organization', 'Role', 'Joined'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={styles.avatar}>{u.name.charAt(0).toUpperCase()}</div>
                      <span style={{ fontWeight: 500, color: '#111827' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <span style={styles.orgPill}>
                      {u.organizationId ? (orgMap[u.organizationId] ?? u.organizationId.slice(0, 8) + '…') : '—'}
                    </span>
                  </td>
                  <td style={styles.td}><RoleBadge role={u.role} /></td>
                  <td style={styles.td}>{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: '0.55rem 0.8rem',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  fontSize: '0.9rem',
  color: '#111827',
  outline: 'none',
  width: '100%',
  background: '#fff',
};

const field: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#374151' },
  required: { color: '#dc2626' },
  hint: { fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.1rem' },
};

const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' },
  btnPrimary: {
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '0.6rem 1.1rem',
    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    background: '#fff', color: '#374151', border: '1px solid #d1d5db',
    borderRadius: '8px', padding: '0.6rem 1.1rem',
    fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
  },
  card: {
    background: '#fff', borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: {
    padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600,
    color: '#6b7280', fontSize: '0.78rem', textTransform: 'uppercase',
    letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
  },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.875rem 1rem', color: '#374151', verticalAlign: 'middle' },
  avatar: {
    width: '34px', height: '34px', borderRadius: '50%',
    background: '#eff6ff', color: '#2563eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
  },
  orgPill: {
    display: 'inline-block', padding: '2px 10px', borderRadius: '6px',
    background: '#f3f4f6', color: '#374151', fontSize: '0.8rem', fontWeight: 500,
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    borderRadius: '8px', padding: '0.65rem 0.875rem',
    fontSize: '0.875rem', marginBottom: '1rem',
  },
  empty: { textAlign: 'center', color: '#9ca3af', padding: '3rem', fontSize: '0.95rem' },
};

const modal: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: '1rem',
  },
  box: {
    background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '460px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb',
    position: 'sticky', top: 0, background: '#fff', zIndex: 1,
  },
  title: { fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#6b7280' },
  form: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
};
