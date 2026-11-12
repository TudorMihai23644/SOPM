import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Fereastră modală pe <dialog>: focusul rămâne în ea, iar Esc o închide. */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="panel panel-ornate m-auto w-[calc(100%-2rem)] max-w-lg overflow-visible p-0 text-ink backdrop:bg-black/75"
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="glow-gold font-display text-xl font-bold text-gold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Închide"
              className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-[3px] text-muted hover:text-gold"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
