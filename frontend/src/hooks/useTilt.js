import { useEffect, useRef } from 'react';

const MAX_TILT_DEG = 8;

/** Mouse-tracked 3D tilt for a single card element. Returns a ref to attach. */
export default function useTilt() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduceMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * MAX_TILT_DEG * 2;
      const rotateX = (0.5 - py) * MAX_TILT_DEG * 2;
      el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleLeave = () => {
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return ref;
}
