'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import jsQR from 'jsqr';
import styles from './QRScanner.module.css';

interface QRScannerProps {
  onCameraError?: () => void;
}

export function QRScanner({ onCameraError }: QRScannerProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const startCamera = async () => {
    setIsStarting(true);
    setHasTorch(false);
    setTorchOn(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);

      // Check for torch support
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err) {
      showToast({ message: 'Could not access camera. Please allow permissions or use manual ID search.', type: 'error' });
      if (onCameraError) {
        onCameraError();
      }
    } finally {
      setIsStarting(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
    setHasTorch(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const nextState = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setTorchOn(nextState);
    } catch (e) {
      showToast({ message: 'Failed to toggle flashlight.', type: 'error' });
    }
  };

  const captureAndDecode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context && video.videoWidth > 0) {
      const MAX_SIZE = 400; // Keep scan size smaller for faster local processing
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      
      try {
        const imageData = context.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          stopCamera();
          showToast({ message: 'QR Code detected.', type: 'success' });
          
          try {
            let path = code.data;
            try {
              const urlObj = new URL(code.data);
              path = urlObj.pathname + urlObj.search;
            } catch {
              // Ignore, keep raw value (in case it is a relative path)
            }
            
            if (path.startsWith('/') || path.includes('/samples/')) {
              router.push(path);
            } else {
              showToast({ message: 'Invalid URL in QR code.', type: 'error' });
            }
          } catch (e) {
            showToast({ message: 'Error routing scanned code.', type: 'error' });
          }
        }
      } catch (e) {
        // Silent catch for image reading errors
      }
    }
  };

  const captureAndDecodeRef = useRef(captureAndDecode);
  captureAndDecodeRef.current = captureAndDecode;

  // Auto-start camera on page mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => captureAndDecodeRef.current(), 1500);
    }
    return () => {
      clearInterval(interval);
    };
  }, [isScanning]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className={styles.container}>
      <div className={styles.scannerWrapper}>
        <video 
          ref={videoRef} 
          className={styles.video} 
          playsInline
          muted
        />
        
        {isScanning && (
          <div className={styles.hudOverlay}>
            <div className={styles.viewfinder}>
              <div className={styles.scannerLine} />
              <span className={`${styles.corner} ${styles.topLeft}`} />
              <span className={`${styles.corner} ${styles.topRight}`} />
              <span className={`${styles.corner} ${styles.bottomLeft}`} />
              <span className={`${styles.corner} ${styles.bottomRight}`} />
            </div>
            <div className={styles.instruction}>
              Align QR code within the frame
            </div>
            
            {/* Quick action buttons floating on top of the camera */}
            <div className={styles.controls}>
              {hasTorch && (
                <button 
                  type="button" 
                  onClick={toggleTorch} 
                  className={`${styles.iconBtn} ${torchOn ? styles.active : ''}`}
                  title="Toggle Flashlight"
                  aria-label="Toggle Flashlight"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M15 17h.01M8.9 13a4.5 4.5 0 0 1 6.2 0M7 11a7 7 0 0 1 10 0M12 21a1 1 0 0 1-1-1v-4h2v4a1 1 0 0 1-1 1z" />
                  </svg>
                </button>
              )}
              <button 
                type="button" 
                onClick={stopCamera} 
                className={styles.iconBtn}
                title="Stop Camera"
                aria-label="Stop Camera"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!(isScanning || isStarting) && (
          <div className={styles.overlay}>
            <div className={styles.startPromo}>
              <svg className={styles.qrIconBig} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
              <p className={styles.promoText}>Camera access is required to scan sample QR codes.</p>
              <Button onClick={startCamera} className={styles.startBtn}>
                {isStarting ? 'Accessing...' : 'Start Scanner'}
              </Button>
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
