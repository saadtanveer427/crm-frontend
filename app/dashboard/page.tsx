'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardPage() {
  const { auth, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!auth) {
      router.replace('/login');
    } else if (auth.user.role === 'admin') {
      router.replace('/dashboard/organizations');
    } else {
      router.replace('/dashboard/customers');
    }
  }, [auth, loading, router]);

  return null;
}
