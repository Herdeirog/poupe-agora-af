import { useRef, useCallback } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipeGesture(config: SwipeConfig) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const threshold = config.threshold ?? 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);

    // Ignore vertical swipes (scroll)
    if (deltaY > Math.abs(deltaX)) {
      touchStart.current = null;
      return;
    }

    if (deltaX > threshold) {
      config.onSwipeRight?.();
    } else if (deltaX < -threshold) {
      config.onSwipeLeft?.();
    }

    touchStart.current = null;
  }, [config, threshold]);

  return { onTouchStart, onTouchEnd };
}
