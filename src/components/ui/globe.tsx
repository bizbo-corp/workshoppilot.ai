"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let phi = 0;
    let width = 0;
    let height = 0;
    let isVisible = true;
    let globe: ReturnType<typeof createGlobe> | null = null;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
        height = canvasRef.current.offsetHeight;
      }
    };
    window.addEventListener("resize", onResize);
    onResize();

    if (!canvasRef.current) return;

    // Wait for theme to resolve
    if (!resolvedTheme) return;

    const isDark = resolvedTheme === "dark";

    // Use lower DPR to reduce canvas rendering cost
    const dpr = Math.min(window.devicePixelRatio, 1.5);

    const canvas = canvasRef.current;

    // Delay globe creation to keep main thread free for initial interactions
    const initTimer = setTimeout(() => {
    globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: height * dpr,
      phi: 0,
      theta: -0.3,
      offset: [0, height * dpr * 0.2],
      dark: isDark ? 1 : 0,
      diffuse: 0.8,
      mapSamples: 10000,
      mapBrightness: 12,
      baseColor: isDark
        ? [0.3, 0.33, 0.24]
        : [0.9, 0.9, 0.88],
      markerColor: [0.545, 0.588, 0.474],
      glowColor: isDark
        ? [0.2, 0.23, 0.18]
        : [0.93, 0.93, 0.917],
      markers: [
        { location: [37.7595, -122.4367], size: 0.03 },
        { location: [40.7128, -74.006], size: 0.05 },
        { location: [51.5074, -0.1278], size: 0.05 },
        { location: [35.6762, 139.6503], size: 0.05 },
        { location: [-33.8688, 151.2093], size: 0.05 },
      ],
      onRender: (state) => {
        // Skip rendering when off-screen to free main thread
        if (!isVisible) return;
        state.phi = phi;
        phi += 0.001;
        state.width = width * dpr;
        state.height = height * dpr;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    });
    }, 1500); // end delayed init

    // Pause globe when not visible to reduce main-thread work
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      clearTimeout(initTimer);
      globe?.destroy();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        placeItems: "center",
        placeContent: "center",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          contain: "layout paint size",
          opacity: 0,
          transition: "opacity 1s ease",
        }}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
      />
    </div>
  );
}
