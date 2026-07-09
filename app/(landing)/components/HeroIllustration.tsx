'use client';

export function HeroIllustration() {
  return (
    <svg viewBox="0 0 320 380" fill="none" style={{ width: '100%', maxWidth: 320, height: 'auto' }}>
      {/* Phone body */}
      <rect x="40" y="10" width="240" height="360" rx="24" fill="var(--color-surface)" stroke="var(--color-outline-variant)" strokeWidth="1.5" />
      <rect x="130" y="18" width="60" height="8" rx="4" fill="var(--color-outline-variant)" />
      {/* Screen content */}
      <rect x="52" y="36" width="216" height="322" rx="4" fill="var(--color-surface-container-low)" />
      {/* Sample logger form */}
      <rect x="64" y="52" width="192" height="28" rx="6" fill="var(--color-surface)" stroke="var(--color-outline-variant)" strokeWidth="1" />
      <text x="72" y="70" fontSize="10" fill="var(--color-outline)" fontFamily="Inter, sans-serif">Sample type...</text>
      <rect x="64" y="88" width="192" height="28" rx="6" fill="var(--color-surface)" stroke="var(--color-outline-variant)" strokeWidth="1" />
      <text x="72" y="106" fontSize="10" fill="var(--color-outline)" fontFamily="Inter, sans-serif">Source...</text>
      <rect x="64" y="124" width="192" height="28" rx="6" fill="var(--color-surface)" stroke="var(--color-outline-variant)" strokeWidth="1" />
      <text x="72" y="142" fontSize="10" fill="var(--color-outline)" fontFamily="Inter, sans-serif">Date...</text>
      {/* Save button */}
      <rect x="64" y="166" width="192" height="36" rx="8" fill="var(--color-primary)" />
      <text x="160" y="189" fontSize="12" fontWeight="600" fill="var(--color-on-primary)" textAnchor="middle" fontFamily="Inter, sans-serif">Save Sample</text>
      {/* Generated ID badge */}
      <rect x="64" y="214" width="192" height="24" rx="6" fill="var(--color-primary-container)" />
      <text x="160" y="230" fontSize="11" fontWeight="700" fill="var(--color-on-primary-container)" textAnchor="middle" fontFamily="monospace">BLD-001</text>
      {/* QR code placeholder */}
      <rect x="120" y="252" width="80" height="80" rx="8" fill="var(--color-surface)" stroke="var(--color-outline-variant)" strokeWidth="1" />
      <line x1="132" y1="264" x2="188" y2="264" stroke="var(--color-outline)" strokeWidth="2" />
      <line x1="188" y1="264" x2="188" y2="320" stroke="var(--color-outline)" strokeWidth="2" />
      <line x1="132" y1="320" x2="188" y2="320" stroke="var(--color-outline)" strokeWidth="2" />
      <line x1="132" y1="264" x2="132" y2="320" stroke="var(--color-outline)" strokeWidth="2" />
      {/* Status indicator */}
      <circle cx="76" cy="340" r="4" fill="var(--color-tertiary)" />
      <text x="86" y="344" fontSize="9" fill="var(--color-tertiary)" fontFamily="Inter, sans-serif">Synced</text>
      {/* Signal bars */}
      <rect x="240" y="336" width="3" height="4" rx="1" fill="var(--color-outline)" />
      <rect x="245" y="333" width="3" height="7" rx="1" fill="var(--color-outline)" />
      <rect x="250" y="329" width="3" height="11" rx="1" fill="var(--color-tertiary)" />
    </svg>
  );
}
