"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let phi = 0;
    let width = 0;
    let height = 0;

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

    // Colors matching the "olive" theme
    // Olive-500: #8b9679 -> [0.545, 0.588, 0.474]
    // Dark bg (Neutral-Olive-950): #293021 -> [0.16, 0.188, 0.13]
    // Light bg (Neutral-Olive-100): #ededea -> [0.93, 0.93, 0.917]

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: height * 2,
      phi: 0,
      theta: -0.3,
      offset: [0, height * 2 * 0.2], // Shift down 20%
      dark: isDark ? 1 : 0,
      diffuse: 0.8,
      mapSamples: 16000,
      mapBrightness: 12, // Higher brightness for dots
      baseColor: isDark
        ? [0.3, 0.33, 0.24] // Brighter (lighter olive for visibility)
        : [0.9, 0.9, 0.88], // Slightly darker than bg
      markerColor: [0.545, 0.588, 0.474], // Olive-500
      glowColor: isDark
        ? [0.2, 0.23, 0.18] // Brighter glow
        : [0.93, 0.93, 0.917],
      markers: [
        // longitude latitude
        { location: [37.7595, -122.4367], size: 0.03 },
        { location: [40.7128, -74.006], size: 0.05 },
        { location: [51.5074, -0.1278], size: 0.05 }, // London
        { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
        { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
      ],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        state.phi = phi;
        phi += 0.001; // Rotation speed
        state.width = width * 2;
        state.height = height * 2;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    });

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [resolvedTheme]);

  return (
    <div
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
