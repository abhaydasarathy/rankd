import React from 'react';

/**
 * Official Rankd Logo Symbol
 * Exact geometric triangular symbol from the official brand asset
 */
export function RankdSymbol({ size = 28, className = '', style = {}, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 307 382"
      fill="none"
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      <polygon points="306 0, 0 190.5, 306 381" fill="currentColor" />
    </svg>
  );
}

/**
 * Official Rankd Logo (Symbol + Wordmark + Tagline)
 */
export default function RankdLogo({
  collapsed = false,
  symbolSize = 28,
  textSize = 18,
  showTagline = true,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`flex items-center gap-2.5 select-none ${className}`}
      style={{ color: 'var(--text-primary)', ...style }}
    >
      <RankdSymbol size={symbolSize} />
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span
            className="font-bold tracking-tight leading-tight"
            style={{ fontSize: `${textSize}px`, color: 'var(--text-primary)' }}
          >
            rankd
          </span>
          {showTagline && (
            <span
              className="tracking-normal leading-normal whitespace-nowrap"
              style={{ fontSize: '11px', color: 'var(--text-muted)' }}
            >
              know your place.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
