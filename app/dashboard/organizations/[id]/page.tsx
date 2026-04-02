'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../contexts/AuthContext';
import { fetchOrganization } from '../../../../lib/api';
import type { Organization } from '../../../../types';

function errorMsg(err: unknown): string {
  const e = err as { message?: string | string[] };
  const m = e.message;
  if (Array.isArray(m)) return m[0];
  return m ?? 'Something went wrong.';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export default function OrganizationDetailPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard/customers');
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin || !id) return;
    fetchOrganization(id)
      .then(setOrg)
      .catch((err) => setError(errorMsg(err)))
      .finally(() => setLoading(false));
  }, [isAdmin, id]);

  if (authLoading || !isAdmin) return null;

  if (loading) return <div style={styles.empty}>Loading…</div>;
  if (error) return <div style={styles.errorBox}>{error}</div>;
  if (!org) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <Link href="/dashboard/organizations" style={styles.breadcrumbLink}>
          Organizations
        </Link>
        <span style={styles.breadcrumbSep}>›</span>
        <span style={styles.breadcrumbCurrent}>{org.name}</span>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerAvatar}>
          {org.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={styles.pageTitle}>{org.name}</h1>
          <p style={styles.pageMeta}>Created {fmtDate(org.createdAt)}</p>
        </div>
      </div>

      {/* Quick-nav tiles */}
      <div style={styles.tilesGrid}>
        <Link href={`/dashboard/customers?orgId=${org.id}`} style={styles.tile}>
          <span style={styles.tileIcon}>👥</span>
          <div>
            <p style={styles.tileLabel}>Customers</p>
            <p style={styles.tileDesc}>View &amp; manage customers</p>
          </div>
          <span style={styles.tileArrow}>›</span>
        </Link>

        <Link href={`/dashboard/users?orgId=${org.id}`} style={styles.tile}>
          <span style={styles.tileIcon}>🧑‍💼</span>
          <div>
            <p style={styles.tileLabel}>Users</p>
            <p style={styles.tileDesc}>View &amp; manage users</p>
          </div>
          <span style={styles.tileArrow}>›</span>
        </Link>

        <Link href={`/dashboard/activity-logs?orgId=${org.id}`} style={styles.tile}>
          <span style={styles.tileIcon}>📋</span>
          <div>
            <p style={styles.tileLabel}>Activity Logs</p>
            <p style={styles.tileDesc}>Audit trail for this org</p>
          </div>
          <span style={styles.tileArrow}>›</span>
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: { textAlign: 'center', color: '#9ca3af', padding: '3rem', fontSize: '0.95rem' },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    borderRadius: '8px', padding: '0.65rem 0.875rem', fontSize: '0.875rem',
  },
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    fontSize: '0.85rem', marginBottom: '1.5rem',
  },
  breadcrumbLink: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
  breadcrumbSep: { color: '#d1d5db' },
  breadcrumbCurrent: { color: '#6b7280' },
  header: {
    display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem',
  },
  headerAvatar: {
    width: '52px', height: '52px', borderRadius: '12px',
    background: '#eff6ff', color: '#2563eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '1.3rem', flexShrink: 0,
  },
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  pageMeta: { fontSize: '0.8rem', color: '#9ca3af', margin: '0.2rem 0 0' },
  tilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1rem',
  },
  tile: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    background: '#fff', borderRadius: '10px',
    padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    textDecoration: 'none', color: 'inherit',
  },
  tileIcon: { fontSize: '1.5rem', flexShrink: 0 },
  tileLabel: { fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.95rem' },
  tileDesc: { color: '#9ca3af', fontSize: '0.8rem', margin: '0.15rem 0 0' },
  tileArrow: { marginLeft: 'auto', fontSize: '1.25rem', color: '#d1d5db', flexShrink: 0 },
};
