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
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Închide"
              className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
