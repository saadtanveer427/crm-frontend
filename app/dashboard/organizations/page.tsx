'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchOrganizations } from '../../../lib/api';
import type { Organization } from '../../../types';

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

export default function OrganizationsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgs, setOrgs] = useState<Organization[]>([]);
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
    fetchOrganizations()
      .then(setOrgs)
      .catch((err) => setError(errorMsg(err)))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (authLoading || !isAdmin) return null;

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Organizations</h1>
          <p style={styles.pageSubtitle}>{orgs.length} organization{orgs.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Loading…</div>
      ) : orgs.length === 0 ? (
        <div style={styles.empty}>No organizations found.</div>
      ) : (
        <div style={styles.grid}>
          {orgs.map((org) => (
            <div
              key={org.id}
              style={styles.card}
              onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/organizations/${org.id}`)}
            >
              <div style={styles.cardAvatar}>
                {org.name.charAt(0).toUpperCase()}
              </div>
              <div style={styles.cardBody}>
                <p style={styles.cardName}>{org.name}</p>
                <p style={styles.cardMeta}>Created {fmtDate(org.createdAt)}</p>
              </div>
              <span style={styles.cardArrow}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    marginBottom: '1.75rem',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0.25rem 0 0',
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
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '3rem',
    fontSize: '0.95rem',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#fff',
    borderRadius: '10px',
    padding: '1.1rem 1.25rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
    outline: 'none',
  },
  cardAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: '0.975rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  cardMeta: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    margin: '0.2rem 0 0',
  },
  cardArrow: {
    fontSize: '1.25rem',
    color: '#d1d5db',
    flexShrink: 0,
  },
};
