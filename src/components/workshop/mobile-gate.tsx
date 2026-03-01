'use client';

/**
 * MobileGate
 *
 * Full-screen dismissible overlay for mobile and small-tablet users visiting
 * workshop pages. Recommends desktop use since the canvas and AI tools
 * require a larger screen.
 *
 * Detection: coarse pointer AND viewport < 1024px — intentionally one-shot
 * at mount; no resize listener (locked decision).
 *
 * Dismissal: sessionStorage key `wp_mobile_gate_dismissed` persists for the
 * browser session (tab). New tab = gate shows again.
 *
 * z-[200] sits above session-ended overlay at z-[100].
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Check, Monitor } from 'lucide-react';

const SESSION_KEY = 'wp_mobile_gate_dismissed';

interface MobileGateProps {
  workshopName?: string;
}

export function MobileGate({ workshopName }: MobileGateProps) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        return;
      }
    } catch {
      // sessionStorage unavailable — fall through to detection
    }

    // Detect coarse-pointer device with viewport < 1024px
    const query = window.matchMedia('(pointer: coarse) and (max-width: 1023px)');
    if (query.matches) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage unavailable — dismiss visually only
    }
    setShow(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently degrade
    }
  }

  const mailtoSubject = workshopName
    ? `Continue "${workshopName}" on desktop — WorkshopPilot`
    : 'Continue your workshop on desktop — WorkshopPilot';

  const mailtoBody =
    typeof window !== 'undefined'
      ? `Open this link on your desktop to continue your workshop:\n\n${window.location.href}`
      : 'Open this link on your desktop to continue your workshop.';

  const mailtoHref = `mailto:?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="mobile-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-neutral-olive-950 px-6"
        >
          <div className="flex flex-col items-center gap-6 text-center max-w-sm">
            {/* Illustration */}
            <Monitor
              className="w-24 h-24 text-neutral-olive-300"
              strokeWidth={1.25}
            />

            {/* Copy */}
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-semibold text-neutral-olive-50">
                WorkshopPilot works best on desktop
              </h1>
              <p className="text-sm text-neutral-olive-300">
                The canvas and AI tools need a larger screen for the best experience.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-3 w-full">
              {/* Primary: Email link */}
              <a
                href={mailtoHref}
                className="w-full inline-flex items-center justify-center rounded-md bg-neutral-olive-100 text-neutral-olive-900 hover:bg-neutral-olive-200 px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Email this link to myself
              </a>

              {/* Secondary: Copy link */}
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 text-sm text-neutral-olive-400 hover:text-neutral-olive-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy link
                  </>
                )}
              </button>

              {/* Tertiary: Continue anyway */}
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-neutral-olive-400 underline underline-offset-4 hover:text-neutral-olive-300 transition-colors mt-1"
              >
                Continue anyway
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
