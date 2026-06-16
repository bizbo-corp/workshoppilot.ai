import { put } from "@vercel/blob";
import { generateGeminiImage, GEMINI_IMAGE_MODEL } from "@/lib/ai/generate-gemini-image";
import { deleteBlobUrls } from "@/lib/blob/delete-blob-urls";
import { recordUsageEvent } from "@/lib/ai/usage-tracking";
import { checkRateLimit, rateLimitResponse } from "@/lib/ai/rate-limiter";
import { checkImageGenerationCap, imageCapExceededResponse } from "@/lib/ai/image-generation-cap";
import { authenticateWorkshopRequest, unauthorizedResponse } from "@/lib/auth/workshop-request-auth";
import { genderForPoolName } from "@/lib/ai/persona-name-pools";

/**
 * Increase Vercel serverless timeout for image generation
 */
export const maxDuration = 60;

/**
 * Stable, non-cryptographic string hash. Used to derive deterministic
 * appearance traits from a persona's name so the same persona keeps a
 * consistent look across regenerations, while different personas vary.
 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[Math.abs(n) % arr.length];
}

/* Common gendered first names. Anything not listed falls back to a
   deterministic coin-flip so even unisex names (Sam, Lee, Jordan) resolve
   to a clearly male OR female portrait rather than an androgynous one. */
const MALE_NAMES = new Set([
  "james", "john", "robert", "michael", "william", "david", "richard", "joseph",
  "thomas", "tom", "charles", "chris", "christopher", "daniel", "dan", "matthew",
  "matt", "anthony", "mark", "donald", "steven", "steve", "paul", "andrew", "andy",
  "joshua", "josh", "kenneth", "kevin", "brian", "george", "edward", "ed", "ronald",
  "timothy", "tim", "jason", "jeffrey", "jeff", "ryan", "gary", "jacob", "jake",
  "nicholas", "nick", "eric", "jonathan", "stephen", "larry", "justin", "scott",
  "brandon", "benjamin", "ben", "gregory", "greg", "frank", "alexander", "alex",
  "raymond", "patrick", "jack", "dennis", "tyler", "aaron", "jose", "henry", "adam",
  "peter", "pete", "nathan", "harry", "carl", "arthur", "liam", "noah", "oliver",
  "elijah", "lucas", "mason", "logan", "ethan", "owen", "dylan", "gabriel", "carlos",
  "juan", "luis", "miguel", "mohammed", "muhammad", "ahmed", "ali", "omar", "wei",
  "hiroshi", "raj", "arjun", "dmitri", "ivan", "sergei", "lars", "hans", "pierre",
  "marco", "giovanni", "diego", "pablo", "santiago",
]);

const FEMALE_NAMES = new Set([
  "mary", "patricia", "jennifer", "jen", "linda", "elizabeth", "liz", "barbara",
  "susan", "sue", "jessica", "jess", "sarah", "karen", "nancy", "lisa", "betty",
  "margaret", "maggie", "sandra", "ashley", "kimberly", "kim", "emily", "donna",
  "michelle", "carol", "amanda", "dorothy", "melissa", "deborah", "deb", "stephanie",
  "steph", "rebecca", "becca", "sharon", "laura", "cynthia", "kathleen", "amy",
  "angela", "shirley", "anna", "brenda", "pamela", "pam", "emma", "nicole", "helen",
  "samantha", "katherine", "kate", "christine", "rachel", "carolyn", "janet", "maria",
  "heather", "diane", "olivia", "sophia", "sofia", "isabella", "mia", "charlotte",
  "amelia", "harper", "evelyn", "abigail", "abby", "ella", "grace", "chloe", "victoria",
  "aria", "lily", "hannah", "layla", "zoe", "nora", "priya", "mei", "yuki", "fatima",
  "aisha", "valentina", "ingrid", "freya", "anya", "natasha", "elena",
]);

function inferGenderNoun(name: string | undefined, seed: number): "man" | "woman" {
  // Names from our persona pools carry a declared gender — authoritative, and
  // covers Māori / non-English names the lookup sets below miss (otherwise they
  // coin-flip and the portrait gender drifts between regenerations).
  const fromPool = genderForPoolName(name);
  if (fromPool) return fromPool;
  const first = (name || "").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  if (first && MALE_NAMES.has(first)) return "man";
  if (first && FEMALE_NAMES.has(first)) return "woman";
  // Unisex / unknown / no name: deterministic coin-flip keeps it decisive.
  return seed % 2 === 0 ? "man" : "woman";
}

/* Appearance variety — broken out so generated avatars aren't all the same
   ethnicity / hair / accessories. Selected deterministically per persona. */

/* Ethnicity is grounded in the persona's name: a recognisably East Asian,
   Hispanic or Māori name token steers the portrait to match, so "Chan" never
   reads as English and "Richard" never reads as Chinese. Anglo names get a
   little variance within the Western cluster; truly unknown names get the
   full range. */
const ALL_ETHNICITIES = [
  "Māori", "White", "American", "English", "Hispanic", "Korean", "Chinese",
] as const;
const ANGLO_ETHNICITIES = ["White", "American", "English"] as const;

const CHINESE_TOKENS = new Set([
  "chan", "chen", "chang", "cheng", "wong", "wang", "li", "lin", "liu", "zhang",
  "zhao", "huang", "wu", "yang", "chow", "lam", "ng", "cheung", "tang", "tan",
  "ong", "goh", "xu", "xie", "sun", "ma", "gao", "zhou", "hu", "guo", "luo",
  "deng", "feng", "fang", "yan", "wei", "mei", "ling", "hui", "yip", "fung",
  "kwok", "lau", "leung", "tsang", "yeung", "qing", "xin",
]);
const KOREAN_TOKENS = new Set([
  "kim", "park", "choi", "jung", "jeong", "kang", "cho", "yoon", "jang", "lim",
  "han", "shin", "seo", "kwon", "hwang", "ahn", "bae", "nam", "jeon", "moon",
  "hyun", "soo", "jisoo", "minjun", "jiwoo", "seojun", "eunwoo", "jihoon",
]);
const HISPANIC_TOKENS = new Set([
  "garcia", "rodriguez", "martinez", "hernandez", "lopez", "gonzalez",
  "gonzales", "perez", "sanchez", "ramirez", "torres", "flores", "rivera",
  "gomez", "diaz", "cruz", "morales", "ortiz", "gutierrez", "ruiz", "alvarez",
  "castillo", "romero", "vargas", "ramos", "reyes", "mendoza", "jimenez",
  "herrera", "medina", "aguilar", "jose", "juan", "carlos", "maria", "sofia",
  "valentina", "diego", "miguel", "luis", "pablo", "santiago", "elena",
  "mateo", "lucia", "camila", "alejandro", "javier",
]);
const MAORI_TOKENS = new Set([
  "ngata", "tane", "kahu", "rangi", "aroha", "manaia", "nikau", "anaru", "hemi",
  "wiremu", "kauri", "moana", "marama", "ihaka", "tama", "mereana", "kiri",
  "hone", "rawiri", "te", "tipene", "wikitoria", "ataahua", "maia", "koa",
  "manaaki", "kahukura", "matiu", "paora", "awhina",
]);
const ANGLO_TOKENS = new Set([
  "richard", "tom", "thomas", "james", "john", "jack", "robert", "michael",
  "david", "william", "will", "charles", "charlie", "daniel", "matthew",
  "anthony", "mark", "paul", "andrew", "kenneth", "kevin", "brian", "george",
  "edward", "ronald", "harry", "henry", "oliver", "oscar", "jacob", "joseph",
  "ben", "benjamin", "samuel", "nathan", "peter", "adam", "simon", "philip",
  "gary", "dennis", "frank", "arthur", "walter", "sarah", "emma", "emily",
  "olivia", "charlotte", "amelia", "grace", "lily", "hannah", "chloe", "ella",
  "sophie", "jessica", "jennifer", "elizabeth", "katherine", "kate", "laura",
  "anna", "lucy", "megan", "rachel", "rebecca", "victoria", "alice", "claire",
  "helen", "margaret", "abigail", "smith", "jones", "williams", "brown",
  "taylor", "davies", "wilson", "evans", "roberts", "johnson", "walker",
  "robinson", "wright", "thompson", "hughes", "edwards", "hall", "wood",
  "harris", "clark", "jackson", "baker", "carter", "mitchell", "turner",
  "parker", "collins",
]);

function inferEthnicity(name: string | undefined, seed: number): string {
  const tokens = (name || "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z]/g, ""))
    .filter(Boolean);

  // Recognisable ethnic name signals win over an Anglo first name
  // (e.g. "Sarah Chen" reads East Asian, "Tom Garcia" reads Hispanic).
  if (tokens.some((t) => CHINESE_TOKENS.has(t))) return "Chinese";
  if (tokens.some((t) => KOREAN_TOKENS.has(t))) return "Korean";
  if (tokens.some((t) => HISPANIC_TOKENS.has(t))) return "Hispanic";
  if (tokens.some((t) => MAORI_TOKENS.has(t))) return "Māori";
  // Anglo names: a little variance within the Western cluster.
  if (tokens.some((t) => ANGLO_TOKENS.has(t))) return pick(ANGLO_ETHNICITIES, seed >> 1);
  // Unknown name: allow the full diverse range.
  return pick(ALL_ETHNICITIES, seed >> 1);
}

const HAIR_STYLES = [
  "with short cropped hair", "with curly hair", "with wavy hair", "with long hair",
  "with a shaved head", "with hair tied back", "with natural textured hair",
  "with a neat buzz cut", "with braided hair", "with greying hair",
] as const;

/* Solid background colours, drawn from the sticky-note palette in globals.css
   (--canvas-*-pastel). Passed as hex so the result sits on a brand colour. */
const BACKGROUND_COLORS = [
  { name: "pastel yellow", hex: "#ffe299" },
  { name: "pastel pink", hex: "#ffa8db" },
  { name: "pastel blue", hex: "#a8daff" },
  { name: "pastel green", hex: "#b3efbd" },
  { name: "pastel orange", hex: "#ffd3a8" },
  { name: "pastel red", hex: "#ffafa3" },
  { name: "pastel teal", hex: "#b3f4ef" },
  { name: "pastel purple", hex: "#d3bdff" },
] as const;

/**
 * Builds a deterministic image prompt from persona data.
 * Eliminates the need for an LLM prompt-crafting step.
 *
 * Appearance traits (sex, ethnicity, hair, glasses, background colour) are
 * derived deterministically from the persona name — the same persona keeps a
 * stable look across regenerations, while a set of personas reads as diverse.
 */
function buildImagePrompt(persona: {
  name?: string;
  age?: number;
  job?: string;
  archetype?: string;
  archetypeRole?: string;
  empathyPains?: string;
  empathyGains?: string;
  narrative?: string;
  quote?: string;
}): string {
  const seed = hashString((persona.name || persona.job || "persona").toLowerCase());

  const gender = inferGenderNoun(persona.name, seed);
  const ethnicity = inferEthnicity(persona.name, seed);
  const hair = pick(HAIR_STYLES, seed >> 3);
  const wearsGlasses = (seed >> 6) % 5 < 2; // ~40% wear glasses
  const bg = pick(BACKGROUND_COLORS, seed >> 9);

  const agePart = persona.age ? `${persona.age}-year-old ` : "";
  const subject = `${agePart}${ethnicity} ${gender} ${hair}${wearsGlasses ? ", wearing glasses" : ""}`;
  const jobPart = persona.job ? ` who works as ${persona.job}` : "";
  const nameContext = persona.name ? ` (named ${persona.name})` : "";

  const basePrompt = `Modern profile avatar portrait of a ${subject}${jobPart}${nameContext}. Head-and-shoulders, minimalist centered composition, soft studio lighting, natural candid expression. Flat solid ${bg.name} background, hex color ${bg.hex} — one single solid fill colour across the entire background, no gradient, no texture, no vignette. Clean digital portrait style, sharp focus. No text, no words, no letters, no watermarks, no logos, no graphics, no overlays, no UI elements — portrait only.`;

  const personality = persona.archetype
    ? `Archetype: ${persona.archetype}${persona.archetypeRole ? ` — ${persona.archetypeRole}` : ""}.`
    : "";

  const expression = persona.empathyPains
    ? `Expression conveys: ${persona.empathyPains.split(";")[0].trim().slice(0, 80)}.`
    : "";

  const context = persona.quote
    ? `Captures the essence of someone who says: "${persona.quote.slice(0, 100)}"`
    : "";

  return `${basePrompt} ${personality} ${expression} ${context}`.trim();
}

/**
 * POST /api/ai/generate-persona-image
 * Generates a B&W caricature portrait using Gemini Flash Image.
 *
 * Request body:
 * - workshopId: string
 * - templateId: string
 * - name, age, job, archetype, archetypeRole, empathyPains, empathyGains, narrative, quote
 */
export async function POST(req: Request) {
  // Parse body first so we can scope guest auth to the requested workshop.
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const {
    workshopId,
    templateId,
    name,
    age,
    job,
    archetype,
    archetypeRole,
    empathyPains,
    empathyGains,
    narrative,
    quote,
    previousAvatarUrl,
  } = body as {
    workshopId?: string;
    templateId?: string;
    name?: string;
    age?: number;
    job?: string;
    archetype?: string;
    archetypeRole?: string;
    empathyPains?: string;
    empathyGains?: string;
    narrative?: string;
    quote?: string;
    previousAvatarUrl?: string;
  };

  if (!workshopId || !templateId) {
    return new Response(
      JSON.stringify({ error: "workshopId and templateId are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Requires a Clerk session AND membership of this workshop (owner or
  // participant). Shared with the sketch-image endpoints so authenticated
  // participants can generate persona avatars on their own canvas.
  const authResult = await authenticateWorkshopRequest(workshopId);
  if (!authResult) return unauthorizedResponse();

  const rl = checkRateLimit(authResult.rateLimitKey, "image-gen");
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    // Check per-item generation cap
    const itemId = `persona:${workshopId}:${templateId}`;
    const capCheck = await checkImageGenerationCap(itemId);
    if (!capCheck.allowed) {
      return imageCapExceededResponse();
    }

    const prompt = buildImagePrompt({
      name,
      age,
      job,
      archetype,
      archetypeRole,
      empathyPains,
      empathyGains,
      narrative,
      quote,
    });

    const result = await generateGeminiImage({
      prompt,
      aspectRatio: "1:1",
    });

    // Record usage with itemId for cap tracking
    recordUsageEvent({
      workshopId,
      stepId: "persona",
      operation: "generate-persona-image",
      model: GEMINI_IMAGE_MODEL,
      imageCount: 1,
      itemId,
    });

    const base64Data = result.base64;
    const mimeType = result.mediaType || "image/png";

    // Upload to Vercel Blob or fall back to data URL
    let imageUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const buffer = Buffer.from(base64Data, "base64");
      const extension = mimeType === "image/png" ? "png" : "webp";

      const blob = await put(
        `personas/${workshopId}/${templateId}.${extension}`,
        buffer,
        {
          access: "public",
          addRandomSuffix: true,
        },
      );
      imageUrl = blob.url;
    } else {
      // Fallback: data URL for local dev
      console.warn(
        "BLOB_READ_WRITE_TOKEN not set — storing persona image as data URL.",
      );
      imageUrl = `data:${mimeType};base64,${base64Data}`;
    }

    // Clean up previous avatar blob if URL changed
    if (previousAvatarUrl && previousAvatarUrl !== imageUrl) {
      deleteBlobUrls([previousAvatarUrl]).catch(console.warn);
    }

    return new Response(JSON.stringify({ imageUrl, remainingGenerations: capCheck.remaining - 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate persona image error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate persona image",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
