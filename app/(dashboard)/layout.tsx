'use client';
import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarNav } from '@/components/dashboard/SidebarNav';
import { SyncStatus } from '@/components/layout/SyncStatus';

import { Chatbot } from '@/components/ui/Chatbot';
import { SessionCheck } from '@/components/layout/SessionCheck';
import styles from './dashboard.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <SidebarNav menuOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className={styles.mainWrapper}>
        <Navbar onMenuToggle={() => setMenuOpen(prev => !prev)} />
        <SyncStatus />
        <SessionCheck />
        <main className={styles.main}>
          <div className={styles.content}>
            {children}
          </div>
        </main>
        <Chatbot />
      </div>
    </div>
  );
}