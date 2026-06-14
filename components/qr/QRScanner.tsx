'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import jsQR from 'jsqr';
import styles from './QRScanner.module.css';

export function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  const startCamera = async () => {
    setIsStarting(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err) {
      showToast({ message: 'Could not access camera. Please allow permissions or use file upload.', type: 'error' });
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
        {!(isScanning || isStarting) && (
          <div className={styles.overlay}>
            <Button onClick={startCamera}>Start Camera</Button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {isScanning && (
        <Button variant="secondary" onClick={stopCamera} className={styles.stopBtn}>
          Stop Camera
        </Button>
      )}
    </div>
  );
}
