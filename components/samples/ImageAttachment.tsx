'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { ImageEntry } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './ImageAttachment.module.css';

interface ImageAttachmentProps {
  sampleId: string;
  images: ImageEntry[];
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/tiff'];
const MAX_SIZE = 10 * 1024 * 1024;

export function ImageAttachment({ sampleId, images }: ImageAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({ message: 'Unsupported file type. Please upload a JPEG, PNG, or TIFF image.', type: 'error' });
      return;
    }

    if (file.size > MAX_SIZE) {
      showToast({ message: 'Image too large. Maximum file size is 10MB.', type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/samples/${sampleId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        showToast({ message: 'Image attached.', type: 'success' });
        router.refresh();
      } else {
        const data = await res.json();
        showToast({ message: data.error || 'Upload failed.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Upload failed.', type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Images</h3>
        {hasPermission('attach_image') && (
          <label className={styles.uploadBtn}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
            >
              Add Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/tiff"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      {images.length === 0 ? (
        <p className={styles.empty}>No images attached.</p>
      ) : (
        <div className={styles.gallery}>
          {images.map((img, idx) => (
            <div key={idx} className={styles.imageCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.filename} className={styles.image} />
              <span className={styles.filename}>{img.filename}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
