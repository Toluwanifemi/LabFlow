'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className={styles.nav}>
      <Link href="/samples/new" prefetch={false} className={`${styles.item} ${pathname === '/samples/new' ? styles.active : ''}`}>
        + New
      </Link>
      {(session?.user?.role === 'ADMIN' || session?.user?.role === 'PI') && (
        <Link href="/activity" prefetch={false} className={`${styles.item} ${pathname === '/activity' ? styles.active : ''}`}>
          Activity
        </Link>
      )}
    </nav>
  );
}

