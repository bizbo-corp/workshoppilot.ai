"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MockBuildPack } from "./mock-build-pack";
import { MockCanvas } from "./mock-canvas";
import { MockChat } from "./mock-chat";
import { MockIdea } from "./mock-idea";

/**
 * Step 2 composed: the canvas filling up with a floating AI-facilitator chat
 * card. Exported so the static (mobile / reduced-motion) layout can reuse it.
 */
export function MockWorkshop({ play = true }: { play?: boolean }) {
  return (
    <div className="relative h-full w-full">
      <MockCanvas play={play} />
      <div className="absolute bottom-3 left-3">
        <MockChat play={play} />
      </div>
    </div>
  );
}

/**
 * The animated demo surface for the scroll-driven Process section. `activeStep`
 * (0/1/2) is driven by the GSAP ScrollTrigger in ProcessScrollytelling; each
 * phase crossfades in and plays its own framer-motion entrance on mount.
 */
export function DemoStage({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative aspect-[4/3] w-full">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {activeStep <= 0 && <MockIdea />}
          {activeStep === 1 && <MockWorkshop />}
          {activeStep >= 2 && <MockBuildPack />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
