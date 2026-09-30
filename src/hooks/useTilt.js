import { useRef, useCallback, useEffect } from 'react';

const TILT_MAX = 8;          // degrees max rotation
const SCALE = 1.015;         // subtle scale on hover
const GLOSS_OPACITY = 0.10;  // specular highlight peak opacity

export function useTilt(options = {}) {
  const maxTilt = options.maxTilt ?? TILT_MAX;
  const scale = options.scale ?? SCALE;
  const glossOpacity = options.glossOpacity ?? GLOSS_OPACITY;

  const ref = useRef(null);
  const frameRef = useRef(null);
  const isHovering = useRef(false);

  const onMouseMove = useCallback((e) => {
    // Skip on touch devices or small screens — tilt is a mouse-only effect
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return;
      if (window.matchMedia?.('(pointer: coarse)')?.matches) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    }

    if (!ref.current) return;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      const card = ref.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      // Cursor position relative to card center, normalised -1 to +1
      const cx = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 to +0.5
      const cy = (e.clientY - rect.top) / rect.height - 0.5;

      // Rotation: moving right tilts right (+Y), moving up tilts forward (-X)
      const rotY = cx * maxTilt * 2;   // positive = tilt right
      const rotX = -cy * maxTilt * 2;  // negative = tilt top toward viewer

      // Clamp
      const rX = Math.max(-maxTilt, Math.min(maxTilt, rotX));
      const rY = Math.max(-maxTilt, Math.min(maxTilt, rotY));

      // Specular highlight position (percentage within card)
      const glossX = ((e.clientX - rect.left) / rect.width) * 100;
      const glossY = ((e.clientY - rect.top) / rect.height) * 100;

      card.style.transform = `
        perspective(800px)
        rotateX(${rX.toFixed(2)}deg)
        rotateY(${rY.toFixed(2)}deg)
        translateZ(8px)
        scale(${scale})
      `;
      card.style.transition = 'transform 0ms'; // instant tracking on move

      // Update the gloss layer via CSS custom properties
      const gloss = card.querySelector('.tilt-gloss');
      if (gloss) {
        gloss.style.background = `
          radial-gradient(
            circle at ${glossX.toFixed(1)}% ${glossY.toFixed(1)}%,
            rgba(255,255,255,${glossOpacity}) 0%,
            rgba(255,255,255,0.04) 40%,
            transparent 70%
          )
        `;
        gloss.style.opacity = '1';
      }
    });
  }, [maxTilt, scale, glossOpacity]);

  const onMouseLeave = useCallback(() => {
    isHovering.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const card = ref.current;
    if (!card) return;

    // Smooth settle back to flat
    card.style.transition = 'transform 400ms cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.transform = `
      perspective(800px)
      rotateX(0deg)
      rotateY(0deg)
      translateZ(0px)
      scale(1)
    `;

    const gloss = card.querySelector('.tilt-gloss');
    if (gloss) {
      gloss.style.opacity = '0';
      gloss.style.transition = 'opacity 400ms ease';
    }
  }, []);

  const onMouseEnter = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return;
      if (window.matchMedia?.('(pointer: coarse)')?.matches) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    }

    isHovering.current = true;
    const card = ref.current;
    if (!card) return;
    // Remove settle transition while actively hovering
    card.style.transition = 'transform 0ms';
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { ref, onMouseMove, onMouseLeave, onMouseEnter };
}

export function useTiltSubtle() {
  const ref = useRef(null);
  const frameRef = useRef(null);

  const TILT_MAX_SUBTLE      = 3;      // was 8 — much gentler on wide cards
  const SCALE_SUBTLE         = 1.005;  // was 1.015 — barely perceptible scale
  const GLOSS_OPACITY_SUBTLE = 0.06;   // was 0.10 — softer shine

  const onMouseMove = useCallback((e) => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return;
      if (window.matchMedia?.('(pointer: coarse)')?.matches) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    }
    if (!ref.current) return;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      const card = ref.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const cx = (e.clientX - rect.left) / rect.width  - 0.5;
      const cy = (e.clientY - rect.top)  / rect.height - 0.5;

      const rotY =  cx * TILT_MAX_SUBTLE * 2;
      const rotX = -cy * TILT_MAX_SUBTLE * 2;

      const rX = Math.max(-TILT_MAX_SUBTLE, Math.min(TILT_MAX_SUBTLE, rotX));
      const rY = Math.max(-TILT_MAX_SUBTLE, Math.min(TILT_MAX_SUBTLE, rotY));

      const glossX = ((e.clientX - rect.left) / rect.width)  * 100;
      const glossY = ((e.clientY - rect.top)  / rect.height) * 100;

      card.style.transform = `
        perspective(1200px)
        rotateX(${rX.toFixed(2)}deg)
        rotateY(${rY.toFixed(2)}deg)
        translateZ(4px)
        scale(${SCALE_SUBTLE})
      `;
      card.style.transition = 'transform 0ms';

      const gloss = card.querySelector('.tilt-gloss');
      if (gloss) {
        gloss.style.background = `
          radial-gradient(
            circle at ${glossX.toFixed(1)}% ${glossY.toFixed(1)}%,
            rgba(255,255,255,${GLOSS_OPACITY_SUBTLE}) 0%,
            rgba(255,255,255,0.02) 50%,
            transparent 75%
          )
        `;
        gloss.style.opacity = '1';
      }
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const card = ref.current;
    if (!card) return;

    card.style.transition = 'transform 400ms cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.transform = `
      perspective(1200px)
      rotateX(0deg)
      rotateY(0deg)
      translateZ(0px)
      scale(1)
    `;

    const gloss = card.querySelector('.tilt-gloss');
    if (gloss) {
      gloss.style.opacity = '0';
      gloss.style.transition = 'opacity 400ms ease';
    }
  }, []);

  const onMouseEnter = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return;
      if (window.matchMedia?.('(pointer: coarse)')?.matches) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    }
    const card = ref.current;
    if (!card) return;
    card.style.transition = 'transform 0ms';
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { ref, onMouseMove, onMouseLeave, onMouseEnter };
}

