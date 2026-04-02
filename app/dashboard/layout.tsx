'use client';

import { useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { label: 'Organizations', href: '/dashboard/organizations', adminOnly: true },
  { label: 'Customers', href: '/dashboard/customers', adminOnly: false },
  { label: 'Users', href: '/dashboard/users', adminOnly: true },
  { label: 'Activity Logs', href: '/dashboard/activity-logs', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { auth, loading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !auth) {
      router.replace('/login');
    }
  }, [auth, loading, router]);

  if (loading || !auth) {
    return (
      <div style={styles.loadingScreen}>
        <p style={{ color: '#6b7280' }}>Loading…</p>
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◈</span>
          <span style={styles.logoText}>CRM</span>
        </div>

        <nav style={styles.nav}>
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : {}),
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {auth.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={styles.userName}>{auth.user.name}</p>
              <p style={styles.userRole}>
                {auth.user.role === 'admin' ? 'Administrator' : 'Member'}
              </p>
            </div>
          </div>
          <button onClick={logout} style={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f4f6f9',
  },
  sidebar: {
    width: '220px',
    minWidth: '220px',
    background: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem 0',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0 1.25rem',
    marginBottom: '2rem',
  },
  logoIcon: {
    fontSize: '1.5rem',
    color: '#3b82f6',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '0.05em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    padding: '0 0.75rem',
  },
  navItem: {
    display: 'block',
    padding: '0.65rem 0.875rem',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  navItemActive: {
    background: '#2563eb',
    color: '#ffffff',
  },
  userSection: {
    padding: '1rem 0.75rem',
    borderTop: '1px solid #334155',
    marginTop: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    marginBottom: '0.75rem',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  userName: {
    color: '#f1f5f9',
    fontSize: '0.875rem',
    fontWeight: 600,
    margin: 0,
  },
  userRole: {
    color: '#64748b',
    fontSize: '0.75rem',
    margin: 0,
  },
  logoutBtn: {
    width: '100%',
    padding: '0.5rem',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textAlign: 'center',
  },
  main: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    minWidth: 0,
  },
};
