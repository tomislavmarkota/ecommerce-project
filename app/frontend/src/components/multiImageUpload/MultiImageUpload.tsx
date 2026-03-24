import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './multiImageUpload.module.scss';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type PendingImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
  error?: string;
};

type MultiImageUploadProps = {
  disabled?: boolean;
  maxFiles?: number;
  maxFileSizeMb?: number;
  accept?: string[];
  onUpload: (
    files: File[],
    onProgress: (file: File, progress: number) => void,
  ) => Promise<{
    uploadedCount?: number;
    failedFiles?: Array<{ fileName: string; message?: string }>;
  } | void>;
  onUploaded?: () => void;
};

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const createFileId = (file: File): string => `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const isAcceptedFile = (file: File, accept: string[]): boolean => {
  return accept.includes(file.type);
};

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  disabled = false,
  maxFiles = 12,
  maxFileSizeMb = 5,
  accept = DEFAULT_ACCEPT,
  onUpload,
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<PendingImageItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const maxBytes = useMemo(() => maxFileSizeMb * 1024 * 1024, [maxFileSizeMb]);

  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [items]);

  const openPicker = (): void => {
    if (disabled || isUploading) return;
    inputRef.current?.click();
  };

  const removeItem = (id: string): void => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const updateProgress = (file: File, progress: number): void => {
    setItems((prev) =>
      prev.map((item) =>
        item.file === file
          ? {
              ...item,
              progress,
              status: progress >= 100 ? 'success' : 'uploading',
            }
          : item,
      ),
    );
  };

  const markAllUploading = (): void => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'uploading',
        progress: item.progress || 0,
        error: undefined,
      })),
    );
  };

  const markFailedFiles = (failedFiles: Array<{ fileName: string; message?: string }>): void => {
    if (failedFiles.length === 0) return;

    setItems((prev) =>
      prev.map((item) => {
        const failed = failedFiles.find((entry) => entry.fileName === item.file.name);

        if (!failed) return item;

        return {
          ...item,
          status: 'error',
          error: failed.message || 'Upload failed',
        };
      }),
    );
  };

  const markAllSuccess = (): void => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        progress: 100,
        status: 'success',
      })),
    );
  };

  const addFiles = (incomingFiles: FileList | File[]): void => {
    const normalized = Array.from(incomingFiles);
    const nextErrors: string[] = [];

    if (normalized.length === 0) return;

    setItems((prev) => {
      const availableSlots = Math.max(maxFiles - prev.length, 0);
      const acceptedFiles = normalized.slice(0, availableSlots);
      const rejectedByCount = normalized.length - acceptedFiles.length;

      if (rejectedByCount > 0) {
        nextErrors.push(`You can upload up to ${maxFiles} images at once.`);
      }

      const nextItems: PendingImageItem[] = [];

      for (const file of acceptedFiles) {
        if (!isAcceptedFile(file, accept)) {
          nextErrors.push(`${file.name}: invalid file type.`);
          continue;
        }

        if (file.size > maxBytes) {
          nextErrors.push(`${file.name}: exceeds ${maxFileSizeMb} MB.`);
          continue;
        }

        const duplicateExists = prev.some(
          (item) =>
            item.file.name === file.name &&
            item.file.size === file.size &&
            item.file.lastModified === file.lastModified,
        );

        if (duplicateExists) {
          nextErrors.push(`${file.name}: already selected.`);
          continue;
        }

        nextItems.push({
          id: createFileId(file),
          file,
          previewUrl: URL.createObjectURL(file),
          progress: 0,
          status: 'idle',
        });
      }

      return [...prev, ...nextItems];
    });

    setErrors(nextErrors);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (!event.target.files) return;
    addFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || isUploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const droppedFiles = event.dataTransfer.files;
    if (!droppedFiles?.length) return;

    addFiles(droppedFiles);
  };

  const handleUploadClick = async (): Promise<void> => {
    if (items.length === 0 || isUploading || disabled) return;

    setErrors([]);
    setIsUploading(true);
    markAllUploading();

    try {
      const files = items.map((item) => item.file);

      const result = await onUpload(files, updateProgress);

      const failedFiles = result?.failedFiles ?? [];

      if (failedFiles.length > 0) {
        markFailedFiles(failedFiles);
      } else {
        markAllSuccess();
        onUploaded?.();
      }
    } catch (error) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'error',
          error: 'Upload failed',
        })),
      );

      setErrors(['Upload failed. Please try again.']);
    } finally {
      setIsUploading(false);
    }
  };

  const clearAll = (): void => {
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setErrors([]);
  };

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept.join(',')}
        className={styles.hiddenInput}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
        onClick={openPicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
      >
        <div className={styles.icon}>↑</div>
        <h4 className={styles.title}>Drop images here</h4>
        <p className={styles.subtitle}>
          or <span className={styles.linkLike}>browse files</span>
        </p>
        <p className={styles.meta}>
          Accepted: JPG, PNG, WEBP, AVIF · Max {maxFileSizeMb} MB each · Up to {maxFiles} files
        </p>
      </div>

      {errors.length > 0 && (
        <div className={styles.errorBox}>
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className={styles.toolbar}>
            <span className={styles.selectionInfo}>
              {items.length} file{items.length > 1 ? 's' : ''} selected
            </span>

            <div className={styles.toolbarActions}>
              <button type="button" className={styles.secondaryButton} onClick={clearAll} disabled={isUploading}>
                Clear all
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleUploadClick}
                disabled={isUploading || items.length === 0}
              >
                {isUploading ? 'Uploading...' : 'Upload selected images'}
              </button>
            </div>
          </div>

          <div className={styles.previewGrid}>
            {items.map((item) => (
              <div key={item.id} className={styles.previewCard}>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeItem(item.id);
                  }}
                  disabled={isUploading}
                  aria-label={`Remove ${item.file.name}`}
                >
                  ×
                </button>

                <img src={item.previewUrl} alt={item.file.name} className={styles.previewImage} />

                <div className={styles.previewBody}>
                  <p className={styles.fileName} title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className={styles.fileMeta}>{formatBytes(item.file.size)}</p>
                </div>

                {(item.status === 'uploading' || item.status === 'success' || item.status === 'error') && (
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${item.progress}%` }} />
                    </div>

                    <div className={styles.statusRow}>
                      <span className={styles.progressValue}>{item.progress}%</span>
                      <span
                        className={`${styles.statusBadge} ${
                          item.status === 'success'
                            ? styles.success
                            : item.status === 'error'
                              ? styles.error
                              : styles.uploading
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {item.error && <p className={styles.itemError}>{item.error}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MultiImageUpload;
