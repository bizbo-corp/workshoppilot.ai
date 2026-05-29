// The live homepage renders Landing V4 (GSAP pinned "Process" scrollytelling).
// Route-segment config must live in the route file itself, so it's declared here
// rather than inherited through the re-export. Earlier versions remain at
// /landing-v2, /landing-v3 and the full v4 page at /landing-v4.
export const dynamic = "force-dynamic";
export { default } from "./landing-v4/page";
