import React, { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || isRefreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD + 20));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await onRefresh?.();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const isTriggered = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      style={{ overscrollBehavior: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-150"
        style={{ height: pullDistance > 0 || isRefreshing ? `${isRefreshing ? PULL_THRESHOLD : pullDistance}px` : 0 }}
      >
        <RefreshCw
          className="w-6 h-6 text-purple-500"
          style={{
            transform: `rotate(${isRefreshing ? 0 : progress * 360}deg)`,
            animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
            opacity: progress,
            transition: isRefreshing ? "none" : "transform 0.05s",
          }}
        />
      </div>
      {children}
    </div>
  );
}