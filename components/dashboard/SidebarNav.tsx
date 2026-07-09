'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './SidebarNav.module.css';

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const links: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: '/samples',
    label: 'Sample Log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 00-2 2h-2a2 2 0 00-2-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <path d="M9 11h6M9 15h6" />
      </svg>
    ),
  },
  {
    href: '/scan',
    label: 'Scan QR',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
        <rect x="7" y="7" width="10" height="10" rx="1" />
        <path d="M10 12h4M12 10v4" />
      </svg>
    ),
  },
];

const adminLinks: NavLink[] = [
  {
    href: '/activity',
    label: 'Activity',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10M18 20V4M6 20v-4" />
      </svg>
    ),
  },
  {
    href: '/settings/team',
    label: 'Team',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 100 8 4 4 0 000-8zM2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
      </svg>
    ),
  },
];

export function SidebarNav({ menuOpen, onClose }: { menuOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!menuOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, onClose]);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);


  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'PI';
  const showAdmin = isLoading || isAdmin;

  const renderLinks = () => (
    <>
      {links.map(link => (
        <Link
          key={link.href}
          href={link.href}
          prefetch={false}
          className={`${styles.item} ${isActive(link.href) ? styles.active : ''}`}
          onClick={onClose}
        >
          <span className={styles.linkIcon}>{link.icon}</span>
          <span className={styles.linkText}>{link.label}</span>
        </Link>
      ))}
      {adminLinks.map(link => (
        <Link
          key={link.href}
          href={link.href}
          prefetch={false}
          className={`${styles.item} ${isActive(link.href) ? styles.active : ''} ${!showAdmin ? styles.hidden : ''} ${isLoading ? styles.loading : ''}`}
          onClick={onClose}
        >
          <span className={styles.linkIcon}>{link.icon}</span>
          <span className={styles.linkText}>{link.label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <Link href="/" className={styles.logoText}>LabFlow</Link>
        </div>
        <nav className={styles.navDesktop}>
          {renderLinks()}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {menuOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <aside className={styles.mobileDrawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <Link href="/" className={styles.logoText}>LabFlow</Link>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className={styles.navMobile}>
              {renderLinks()}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
