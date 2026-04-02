'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchActivityLogs } from '../../../lib/api';
import type { ActivityLog } from '../../../types';

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorMsg(err: unknown): string {
  const e = err as { message?: string | string[] };
  const m = e.message;
  if (Array.isArray(m)) return m[0];
  return m ?? 'Something went wrong.';
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created:    { label: 'Created',    color: '#16a34a' },
  updated:    { label: 'Updated',    color: '#2563eb' },
  deleted:    { label: 'Deleted',    color: '#dc2626' },
  restored:   { label: 'Restored',   color: '#7c3aed' },
  assigned:   { label: 'Assigned',   color: '#d97706' },
  note_added: { label: 'Note Added', color: '#0891b2' },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_LABELS[action] ?? { label: action, color: '#6b7280' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: cfg.color + '18',
        color: cfg.color,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function ActivityLogsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard/customers');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    fetchActivityLogs({
      entityType: entityTypeFilter || undefined,
      page,
      limit,
    })
      .then((res) => {
        setLogs(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => setError(errorMsg(err)))
      .finally(() => setLoading(false));
  }, [isAdmin, page, entityTypeFilter]);

  if (authLoading || !isAdmin) return null;

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Activity Logs</h1>
          <p style={styles.pageSubtitle}>{total} events recorded</p>
        </div>

        {/* Filter */}
        <select
          style={{ ...inp, width: '180px' }}
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All entity types</option>
          <option value="customer">Customer</option>
          <option value="note">Note</option>
        </select>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={styles.empty}>No activity logs found.</div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Action', 'Entity Type', 'Entity ID', 'Performed By', 'Timestamp'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={styles.tr}>
                  <td style={styles.td}>
                    <ActionBadge action={log.action} />
                  </td>
                  <td style={styles.td}>
                    <span style={styles.entityType}>{log.entityType}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.entityId} title={log.entityId}>
                      {log.entityId.slice(0, 8)}…
                    </span>
                  </td>
                  <td style={styles.td}>
                    {log.performedBy ? (
                      <div>
                        <span style={{ fontWeight: 500, color: '#111827' }}>{log.performedBy.name}</span>
                        <br />
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{log.performedBy.email}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>{fmtDateTime(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={styles.pageBtn}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: '0.55rem 0.8rem',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  fontSize: '0.875rem',
  color: '#111827',
  outline: 'none',
  background: '#fff',
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
  card: {
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    overflow: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontWeight: 600,
    color: '#6b7280',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.875rem 1rem', color: '#374151', verticalAlign: 'middle' },
  entityType: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    background: '#f3f4f6',
    fontSize: '0.78rem',
    fontWeight: 500,
    color: '#374151',
    textTransform: 'capitalize',
  },
  entityId: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '1.25rem',
  },
  pageBtn: {
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '0.4rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#374151',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '0.65rem 0.875rem',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  empty: { textAlign: 'center', color: '#9ca3af', padding: '3rem', fontSize: '0.95rem' },
};
