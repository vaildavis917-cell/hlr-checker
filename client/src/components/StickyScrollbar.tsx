import { useRef, useEffect, useState, useCallback, type ReactNode } from "react";

interface StickyScrollbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a horizontally-scrollable container and renders a second,
 * "sticky" scrollbar that stays pinned to the bottom of the viewport.
 * Also supports Shift+mouse-wheel for horizontal scrolling.
 */
export default function StickyScrollbar({ children, className = "" }: StickyScrollbarProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const fakeBarRef = useRef<HTMLDivElement>(null);
  const fakeInnerRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [needsScroll, setNeedsScroll] = useState(false);
  const syncing = useRef(false);

  // Measure content dimensions
  const measure = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const sw = el.scrollWidth;
    const cw = el.clientWidth;
    setScrollWidth(sw);
    setClientWidth(cw);
    setNeedsScroll(sw > cw + 1); // +1 for rounding
  }, []);

  useEffect(() => {
    measure();
    const el = contentRef.current;
    if (!el) return;

    // ResizeObserver to re-measure when table size changes
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    // Also observe the first child (the table itself)
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }

    return () => ro.disconnect();
  }, [measure]);

  // Sync fake scrollbar width
  useEffect(() => {
    if (fakeInnerRef.current) {
      fakeInnerRef.current.style.width = `${scrollWidth}px`;
    }
  }, [scrollWidth]);

  // Sync scroll positions bidirectionally
  const handleContentScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (fakeBarRef.current && contentRef.current) {
      fakeBarRef.current.scrollLeft = contentRef.current.scrollLeft;
    }
    syncing.current = false;
  }, []);

  const handleFakeScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (contentRef.current && fakeBarRef.current) {
      contentRef.current.scrollLeft = fakeBarRef.current.scrollLeft;
    }
    syncing.current = false;
  }, []);

  // Shift+wheel → horizontal scroll
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Shift+wheel or horizontal trackpad
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const delta = e.shiftKey ? e.deltaY : e.deltaX;
        if (delta !== 0) {
          e.preventDefault();
          el.scrollLeft += delta;
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Real scrollable content */}
      <div
        ref={contentRef}
        className="overflow-x-auto scrollbar-table"
        onScroll={handleContentScroll}
      >
        {children}
      </div>

      {/* Sticky fake scrollbar — only shown when content overflows */}
      {needsScroll && (
        <div
          ref={fakeBarRef}
          onScroll={handleFakeScroll}
          className="sticky-scrollbar"
          style={{
            position: "sticky",
            bottom: 0,
            overflowX: "auto",
            overflowY: "hidden",
            width: `${clientWidth}px`,
            zIndex: 10,
          }}
        >
          <div
            ref={fakeInnerRef}
            style={{
              height: 1,
              width: scrollWidth,
            }}
          />
        </div>
      )}
    </div>
  );
}
