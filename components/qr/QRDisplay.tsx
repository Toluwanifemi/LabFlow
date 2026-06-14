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
    </div>
  );
}
