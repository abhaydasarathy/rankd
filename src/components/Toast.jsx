import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, title, message, type, onClose }) {
  // Support both object prop { toast } and individual props
  const toastData = toast || { title, message, type };
  if (!toastData || (!toastData.title && !toastData.message)) return null;

  const isSuccess = toastData.type === 'success';
  const isError = toastData.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm">
      <div
        className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border shadow-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: isSuccess ? 'var(--green-bar)' : isError ? '#EF4444' : 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        {isSuccess && <CheckCircle2 size={18} style={{ color: 'var(--green)', flexShrink: 0, marginTop: '2px' }} />}
        {isError && <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />}
        {!isSuccess && !isError && <Info size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />}

        <div className="flex-1 pr-1">
          <h4
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: isSuccess ? 'var(--green-text)' : isError ? '#EF4444' : 'var(--text-muted)',
              margin: '0 0 2px 0',
            }}
          >
            {toastData.title || 'Notification'}
          </h4>
          <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)' }}>
            {toastData.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer hover:opacity-75 transition-opacity p-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
