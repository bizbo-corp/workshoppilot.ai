// The live homepage renders Landing V4 (GSAP pinned "Process" scrollytelling).
// Route-segment config must live in the route file itself, so it's declared here
// rather than inherited through the re-export. The full v4 page also lives at
// /landing-v4; earlier versions (v0/v2/v3) have been deleted.
export const dynamic = "force-dynamic";
export { default } from "./landing-v4/page";
