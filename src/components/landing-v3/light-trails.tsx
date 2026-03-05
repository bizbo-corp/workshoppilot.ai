"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/* ─── Helpers ──────────────────────────────────────────────── */

function centre(el: Element, container: Element) {
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - c.left,
    y: r.top + r.height / 2 - c.top,
  };
}

function elRect(el: Element, container: Element) {
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
}

function bezier(
  ax: number, ay: number,
  bx: number, by: number,
  pullX: number, pullY: number,
) {
  const cp1x = ax + (pullX - ax) * 0.65;
  const cp1y = ay + (pullY - ay) * 0.35;
  const cp2x = pullX + (bx - pullX) * 0.15;
  const cp2y = pullY + (by - pullY) * 0.25;
  return `M${ax},${ay} C${cp1x},${cp1y} ${cp2x},${cp2y} ${bx},${by}`;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const NS = "http://www.w3.org/2000/svg";

const LIME = {
  glow: "#bef264",   // lime-300
  core: "#a3e635",   // lime-400
  faint: "#84cc16",  // lime-500
  dim: "#65a30d",    // lime-600
};

function makePath(
  g: SVGGElement,
  d: string,
  stroke: string,
  width: number,
  opacity: number,
  filter?: string,
) {
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", stroke);
  p.setAttribute("stroke-width", String(width));
  p.setAttribute("stroke-opacity", String(opacity));
  p.setAttribute("stroke-linecap", "round");
  if (filter) p.setAttribute("filter", filter);
  g.appendChild(p);
  return p;
}

/* ─── Component ────────────────────────────────────────────── */

export function LightTrails() {
  const svgRef = useRef<SVGSVGElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const container = svg.parentElement;
    if (!container) return;

    let resizeTimer: ReturnType<typeof setTimeout>;

    function buildPaths() {
      const svg = svgRef.current!;
      const container = svg.parentElement!;

      const sources = Array.from(container.querySelectorAll("[data-trail-source]"));
      const destBox = container.querySelector("[data-trail-dest-container]");
      if (sources.length === 0 || !destBox) return;

      ctxRef.current?.revert();
      svg.querySelectorAll(".trail-group, .convergence-group, .dest-outline").forEach((el) => el.remove());

      const cRect = container.getBoundingClientRect();
      const conv = { x: cRect.width * 0.5, y: cRect.height * 0.62 };

      /* ── Deliverables outline rect ───────────────────── */
      const dr = elRect(destBox, container);
      const pad = 12;
      const outline = document.createElementNS(NS, "rect");
      outline.setAttribute("x", String(dr.x - pad));
      outline.setAttribute("y", String(dr.y - pad));
      outline.setAttribute("width", String(dr.w + pad * 2));
      outline.setAttribute("height", String(dr.h + pad * 2));
      outline.setAttribute("rx", "16");
      outline.setAttribute("ry", "16");
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", LIME.faint);
      outline.setAttribute("stroke-width", "1");
      outline.setAttribute("stroke-opacity", "0.15");
      outline.classList.add("dest-outline");
      svg.appendChild(outline);

      /* ── Path data ───────────────────────────────────── */

      const leftDs = sources.map((el) => {
        const s = centre(el, container);
        // Concave funnel: CP1 jumps quickly to conv.y (pinch toward center line),
        // CP2 hugs conv so curves funnel tightly into the prism.
        const cp1x = s.x + (conv.x - s.x) * 0.25;
        const cp1y = s.y + (conv.y - s.y) * 0.75;
        const cp2x = conv.x - (conv.x - s.x) * 0.08;
        const cp2y = conv.y;
        return `M${s.x},${s.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${conv.x},${conv.y}`;
      });

      const userStoriesEl = container.querySelector('[data-trail-dest="2"]');
      const usR = userStoriesEl
        ? elRect(userStoriesEl, container)
        : { x: dr.x, y: dr.y + dr.h / 2, w: 0, h: 0 };
      const trunkEndX = usR.x;
      const trunkEndY = usR.y + usR.h / 2;
      const trunkD = `M${conv.x},${conv.y} C${conv.x + 60},${conv.y} ${trunkEndX - 80},${trunkEndY} ${trunkEndX},${trunkEndY}`;

      /* ── Render trail ────────────────────────────────── */
      /*
       * Layers per trail (bottom → top):
       *   base     — faint solid, always visible
       *   tailGlow — wide blurred, longest dash, faintest (outer halo)
       *   tailMid  — medium width, medium dash/opacity
       *   tailCore — narrow, shortest dash, brightest (right behind dot)
       *   dot      — bright circle at leading edge
       *
       * All tail layers share the same leading edge (the dot position).
       * Shorter dashes = only visible near the front = natural fade.
       */
      function renderTrail(d: string, id: string) {
        const g = document.createElementNS(NS, "g");
        g.classList.add("trail-group", id);

        const base = makePath(g, d, LIME.dim, 1, 0.12);

        // 6 graduated tail layers: wide/faint → narrow/bright
        const t1 = makePath(g, d, LIME.glow, 10, 0.1,  "url(#trailBlur)");
        const t2 = makePath(g, d, LIME.glow, 7,  0.15, "url(#trailBlur)");
        const t3 = makePath(g, d, LIME.faint, 5, 0.22, "url(#trailBlurLight)");
        const t4 = makePath(g, d, LIME.faint, 3.5, 0.35, "url(#trailBlurLight)");
        const t5 = makePath(g, d, LIME.core, 2.5, 0.5);
        const t6 = makePath(g, d, LIME.core, 1.5, 0.75);

        const dot = document.createElementNS(NS, "circle");
        dot.setAttribute("r", "3");
        dot.setAttribute("fill", LIME.core);
        dot.setAttribute("fill-opacity", "0");
        dot.setAttribute("filter", "url(#dotGlow)");
        g.appendChild(dot);

        svg.appendChild(g);
        return { base, tails: [t1, t2, t3, t4, t5, t6], dot };
      }

      const leftTrails = leftDs.map((d, i) => renderTrail(d, `trail-left-${i}`));
      const trunkTrail = renderTrail(trunkD, "trail-trunk");

      /* ── Convergence prism ───────────────────────────── */

      const cg = document.createElementNS(NS, "g");
      cg.classList.add("convergence-group");

      const outerGlow = document.createElementNS(NS, "circle");
      outerGlow.setAttribute("cx", String(conv.x));
      outerGlow.setAttribute("cy", String(conv.y));
      outerGlow.setAttribute("r", "40");
      outerGlow.setAttribute("fill", "url(#prismGlow)");
      outerGlow.classList.add("prism-outer");
      cg.appendChild(outerGlow);

      const ring = document.createElementNS(NS, "circle");
      ring.setAttribute("cx", String(conv.x));
      ring.setAttribute("cy", String(conv.y));
      ring.setAttribute("r", "12");
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", LIME.core);
      ring.setAttribute("stroke-width", "1.5");
      ring.setAttribute("stroke-opacity", "0.35");
      cg.appendChild(ring);

      const coreDot = document.createElementNS(NS, "circle");
      coreDot.setAttribute("cx", String(conv.x));
      coreDot.setAttribute("cy", String(conv.y));
      coreDot.setAttribute("r", "4");
      coreDot.setAttribute("fill", LIME.core);
      coreDot.setAttribute("fill-opacity", "0.9");
      coreDot.classList.add("prism-core");
      cg.appendChild(coreDot);

      svg.appendChild(cg);

      /* ── GSAP — comet animation ──────────────────────── */

      ctxRef.current = gsap.context(() => {
        function animateComet(
          trail: ReturnType<typeof renderTrail>,
          duration: number,
          initialDelay: number,
          pause: number,
        ) {
          const basePath = trail.base as unknown as SVGPathElement;
          const len = basePath.getTotalLength();

          // 6 graduated dash lengths: longest (outermost) → shortest (closest to dot)
          const maxTail = Math.min(len * 0.3, 130);
          const tailLengths = [
            maxTail,            // t1 — outermost, faintest
            maxTail * 0.8,      // t2
            maxTail * 0.6,      // t3
            maxTail * 0.42,     // t4
            maxTail * 0.25,     // t5
            maxTail * 0.12,     // t6 — innermost, brightest
          ];

          const layers = trail.tails.map((el, i) => ({
            el,
            dashLen: tailLengths[i],
          }));

          layers.forEach(({ el, dashLen }) => {
            el.setAttribute("stroke-dasharray", `${dashLen} ${len + maxTail}`);
            // Start hidden: offset = dashLen puts leading edge at 0,
            // but dash extends backward off the path start
            el.setAttribute("stroke-dashoffset", String(dashLen));
          });

          gsap.set(trail.dot, { attr: { "fill-opacity": 0 } });

          const proxy = { head: 0 };

          gsap.timeline({
            repeat: -1,
            delay: initialDelay,
            repeatDelay: pause,
          }).to(proxy, {
            // Travel past the end so the tail fully slides off
            head: len + maxTail,
            duration,
            ease: "power1.inOut",
            onUpdate() {
              const hp = proxy.head;

              // Update each tail layer — leading edge tracks the dot
              // offset = dashLen - hp  →  leading edge at hp
              layers.forEach(({ el, dashLen }) => {
                el.setAttribute(
                  "stroke-dashoffset",
                  String(dashLen - hp),
                );
              });

              // Dot tracks leading edge, clamped to path
              const dotPos = Math.max(0, Math.min(len, hp));
              const pt = basePath.getPointAtLength(dotPos);
              (trail.dot as unknown as SVGCircleElement).setAttribute("cx", String(pt.x));
              (trail.dot as unknown as SVGCircleElement).setAttribute("cy", String(pt.y));
              (trail.dot as unknown as SVGCircleElement).setAttribute(
                "fill-opacity",
                hp > 0 && hp <= len ? "1" : "0",
              );
            },
          });
        }

        leftTrails.forEach((trail, i) => {
          animateComet(
            trail,
            2.8 + rand(-0.3, 0.3),
            i * rand(0.8, 1.6),
            rand(2.5, 5),
          );
        });

        animateComet(
          trunkTrail,
          2.0 + rand(-0.2, 0.2),
          rand(0.5, 1.5),
          rand(2, 4),
        );

        // Prism breathe
        gsap.to(svg.querySelector(".prism-outer"), {
          scale: 1.2,
          opacity: 0.6,
          duration: 2.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          transformOrigin: "center center",
        });

        gsap.to(svg.querySelector(".prism-core"), {
          fillOpacity: 0.4,
          duration: 1.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }, svg);
    }

    const timer = setTimeout(buildPaths, 250);

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildPaths, 150);
    });
    ro.observe(container);

    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      ro.disconnect();
      ctxRef.current?.revert();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="light-trails-svg absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      <defs>
        <filter id="trailBlur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="trailBlurLight">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="dotGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="prismGlow" r="50%" cx="50%" cy="50%">
          <stop offset="0%" stopColor={LIME.glow} stopOpacity="0.25" />
          <stop offset="100%" stopColor={LIME.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
