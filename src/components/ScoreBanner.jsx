import React, { useState, useEffect, useRef } from 'react';
import { useTiltSubtle } from '../hooks/useTilt';

export default function ScoreBanner({
  score = 0,
  verified = 0,
  pending = 0,
  unclaimed = 0,
  maxScore = 100,
}) {
  const [displayScore, setDisplayScore] = useState(score || 0);
  const [isBarAnimated, setIsBarAnimated] = useState(false);
  const prevScoreRef = useRef(null);
  const currentDisplayScoreRef = useRef(score || 0);
  const rAFRef = useRef(null);

  const verifiedPercent = Math.min(Math.round((verified / maxScore) * 100), 100);
  const pendingPercent = Math.min(Math.round((pending / maxScore) * 100), 100 - verifiedPercent);
  const totalPercent = Math.min(verifiedPercent + pendingPercent, 100);

  useEffect(() => {
    setIsBarAnimated(true);

    const targetVal = Number(score) || 0;

    if (prevScoreRef.current !== targetVal) {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);

      const startVal = Number(currentDisplayScoreRef.current) || 0;
      prevScoreRef.current = targetVal;

      if (startVal === targetVal) {
        setDisplayScore(targetVal);
        return;
      }

      let start = null;
      const duration = 600;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentVal = startVal + (targetVal - startVal) * eased;
        currentDisplayScoreRef.current = currentVal;

        setDisplayScore(
          Number.isInteger(targetVal)
            ? Math.round(currentVal)
            : Number(currentVal.toFixed(1))
        );

        if (progress < 1) {
          rAFRef.current = requestAnimationFrame(step);
        } else {
          setDisplayScore(targetVal);
          currentDisplayScoreRef.current = targetVal;
        }
      };

      rAFRef.current = requestAnimationFrame(step);
    } else {
      setDisplayScore(targetVal);
      currentDisplayScoreRef.current = targetVal;
    }

    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [score]);

  const renderedScore = (displayScore === 0 && (score || 0) > 0) ? score : displayScore;
  const tilt = useTiltSubtle();

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      onMouseEnter={tilt.onMouseEnter}
      className="score-banner tilt-card flex flex-col gap-4"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '20px 28px',
        marginBottom: '24px',
      }}
    >
      <div className="tilt-gloss" aria-hidden="true" />

      {/* Top Row: Score Display & Progress Percentage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Overall Placement Score */}
        <div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Overall Placement Score
          </span>
          <div className="flex items-baseline gap-2">
            <span
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {renderedScore}
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--text-muted)',
              }}
            >
              / {maxScore}
            </span>
          </div>
        </div>

        {/* Right: Three Stat Pills Inline */}
        <div className="score-banner-stats flex flex-wrap items-center gap-2.5">
          {/* Verified Pill */}
          <div
            className="score-banner-pill flex items-center gap-1.5 border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--green-bar)' }}
            />
            <span>Verified {verified}</span>
          </div>

          {/* Pending Pill */}
          <div
            className="score-banner-pill flex items-center gap-1.5 border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--amber-bar)' }}
            />
            <span>Pending {pending}</span>
          </div>

          {/* Unclaimed Pill */}
          <div
            className="score-banner-pill flex items-center gap-1.5 border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0 border"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--text-muted)',
              }}
            />
            <span>Unclaimed {unclaimed}</span>
          </div>

          {/* Overall Percentage Badge */}
          <div
            className="flex items-center gap-1 border"
            style={{
              backgroundColor: 'var(--green-light)',
              borderColor: 'var(--border)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--green-text)',
            }}
          >
            {totalPercent}%
          </div>
        </div>
      </div>

      {/* Center: Full-width Thin Multi-Segment Progress Bar */}
      <div
        className="w-full relative overflow-hidden flex"
        style={{
          height: '6px',
          backgroundColor: 'var(--bg-input)',
          borderRadius: '9999px',
        }}
      >
        {/* Verified segment */}
        <div
          style={{
            width: isBarAnimated ? `${verifiedPercent}%` : '0%',
            backgroundColor: 'var(--green-bar)',
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
            height: '100%',
          }}
        />
        {/* Pending segment */}
        <div
          style={{
            width: isBarAnimated ? `${pendingPercent}%` : '0%',
            backgroundColor: 'var(--amber-bar)',
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1) 100ms',
            height: '100%',
          }}
        />
      </div>
    </div>
  );
}
