'use client';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import styles from './Navbar.module.css';

export function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleToggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left: Lab name */}
        <div className={styles.leftSection}>
          <button className={styles.menuToggle} onClick={onMenuToggle} aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {session?.user?.labName && (
            <span className={styles.labBadge}>{session.user.labName}</span>
          )}
        </div>

        {/* Right: User Profile */}
        <div className={styles.rightSection}>
          {session?.user ? (
            <div className={styles.profileContainer} ref={dropdownRef}>
              <button className={styles.profileButton} onClick={handleToggleDropdown}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>
                    {getInitials(session.user.name)}
                  </div>
                  <span className={styles.onlineIndicator} />
                </div>
                <span className={styles.userName}>
                  {session.user.name ? session.user.name.split(' ')[0] : 'User'}
                </span>
                <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <p className={styles.dropdownName}>{session.user.name}</p>
                    <p className={styles.dropdownRole}>{session.user.role}</p>
                    {session.user.labName && <p className={styles.dropdownLab}>{session.user.labName}</p>}
                  </div>
                  <hr className={styles.divider} />
                  <button onClick={() => signOut()} className={styles.dropdownItem}>
                    <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="/auth" className={styles.loginLink}>Login</a>
          )}
        </div>
      </div>
    </header>
  );
}
