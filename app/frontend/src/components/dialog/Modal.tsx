import { useEffect, useRef } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
};

export function Modal({
  open,
  title,
  onSubmit,
  onClose,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault(); // prevent default close so we control state
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      style={{
        border: 'none',
        borderRadius: '12px',
        padding: 0,
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        background: '#fff',
      }}
    >
      <div style={{ padding: '28px 28px 20px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem', fontWeight: 600 }}>{title}</h2>

        {children}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '7px',
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            style={{
              padding: '8px 18px',
              borderRadius: '7px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
