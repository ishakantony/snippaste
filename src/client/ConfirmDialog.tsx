export interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, message, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">Are you sure?</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" className="toolbar-btn dialog-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="toolbar-btn dialog-btn dialog-btn--confirm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
