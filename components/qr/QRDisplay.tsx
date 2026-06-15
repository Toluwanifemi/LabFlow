'use client';
import Image from 'next/image';
import styles from './QRDisplay.module.css';

interface QRDisplayProps {
  url: string | null;
  humanId: string;
}

export function QRDisplay({ url, humanId }: QRDisplayProps) {
  if (!url) {
    return (
      <div className={styles.placeholder}>
        <span>QR code generating...</span>
      </div>
    );
  }

  const buildPrintDocument = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QR Label - ${humanId}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      img { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
    <img src="${url}" alt="QR ${humanId}" style="width:160px;height:160px;image-rendering:pixelated;background:white;padding:4px;border-radius:4px;" />
    <div style="font-family:monospace;font-size:28px;font-weight:bold;letter-spacing:1px;">${humanId}</div>
    <div style="font-family:sans-serif;font-size:14px;color:#666;">LabFlow</div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 300); };</script>
</body>
</html>`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print labels.');
      return;
    }
    printWindow.document.write(buildPrintDocument());
    printWindow.document.close();
  };

  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <Image
          src={url}
          alt={`QR Code for ${humanId}`}
          fill
          sizes="150px"
          className={styles.image}
        />
      </div>
      <p className={styles.label}>{humanId}</p>

      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={handlePrint}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Label
        </button>
      </div>
    </div>
  );
}
