import React from 'react';
import { ExternalLink, Link2 } from 'lucide-react';

export default function URLField({
  label,
  value = '',
  onChange,
  placeholder = 'https://...',
  optional = true,
  helperText = '',
  previewLabel = 'Open Link',
  icon: Icon = Link2,
}) {
  const getHref = (url) => {
    if (!url || typeof url !== 'string') return '';
    const clean = url.trim();
    if (!clean) return '';
    return clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
  };

  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim();
    if (!clean) return false;
    return (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('.')) && clean.length > 3;
  };

  const valid = isValidUrl(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          {Icon && <Icon size={13} style={{ color: 'var(--text-muted)' }} />}
          <span>{label}</span>
          {optional ? (
            <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
              (Optional)
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-emerald-500">*</span>
          )}
        </label>

        {valid && (
          <a
            href={getHref(value)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--green-text)' }}
          >
            <span>{previewLabel}</span>
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs font-mono transition-colors focus:outline-none"
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      />

      {helperText && (
        <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
}
