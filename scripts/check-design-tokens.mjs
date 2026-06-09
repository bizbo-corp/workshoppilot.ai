#!/usr/bin/env node
/**
 * Design-token scanner — surfaces color usage that bypasses the olive token
 * system, so the design-system consolidation can be driven incrementally.
 *
 *   node scripts/check-design-tokens.mjs          # report (always exit 0)
 *   node scripts/check-design-tokens.mjs --strict # exit 1 if any OFF_BRAND found
 *
 * Categories:
 *   OFF_BRAND   — gray/slate/zinc/stone/cool-blue families. These should NEVER
 *                 be reintroduced (CLAUDE.md). The --strict gate guards these.
 *   RAW_BW      — bare bg/text/border-white|black utilities. Many are legit
 *                 (white text on a brand-olive header / canvas pastel); review.
 *   STATE_COLOR — amber/red/green/emerald/yellow/orange/purple. Candidates for
 *                 --success / --warning / --info / --destructive tokens, but
 *                 need per-site semantic judgment (sentiment vs decorative).
 *   HEX_IN_TSX  — hardcoded hex colors in component files (tokens belong in CSS).
 *
 * The canvas palette (sticky notes, mind-map branches, persona/HMW tints) is
 * intentionally vivid and lives outside the olive system — those files are
 * allow-listed below.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const SCAN_DIRS = ["src/components", "src/app"]
const STRICT = process.argv.includes("--strict")

// Files/paths intentionally exempt (deliberate canvas/brand palettes, demos).
const ALLOWLIST = [
  /globals\.css$/,
  /\/canvas\//, // canvas palette is intentionally off-olive
  /sticky-note/,
  /mind-map/,
  /Logo\.tsx$/, // brand mark — tracked separately
  /\/landing(-v\d)?\//, // marketing pages use their own palettes
  /\/marketing\//,
  /\/ezydraw\//, // drawing tool — user-pickable arbitrary colors
  /\/presentation-capture\//, // export/capture surfaces use literal colors
]

const PATTERNS = {
  OFF_BRAND:
    /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow)-(?:gray|slate|zinc|stone|blue|indigo|sky|cyan|violet|fuchsia)-\d{2,3}\b/g,
  RAW_BW: /\b(?:bg|text|border|ring|fill|stroke)-(?:white|black)\b/g,
  STATE_COLOR:
    /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-(?:amber|red|green|emerald|yellow|orange|rose|purple)-\d{2,3}\b/g,
  HEX_IN_TSX: /#[0-9a-fA-F]{3,8}\b/g,
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (/\.(tsx?|css)$/.test(entry)) out.push(p)
  }
  return out
}

const counts = { OFF_BRAND: 0, RAW_BW: 0, STATE_COLOR: 0, HEX_IN_TSX: 0 }
const samples = { OFF_BRAND: [], RAW_BW: [], STATE_COLOR: [], HEX_IN_TSX: [] }

for (const dir of SCAN_DIRS) {
  let files = []
  try {
    files = walk(join(ROOT, dir))
  } catch {
    continue
  }
  for (const file of files) {
    const rel = relative(ROOT, file)
    if (ALLOWLIST.some((re) => re.test(rel))) continue
    const isCss = file.endsWith(".css")
    const lines = readFileSync(file, "utf8").split("\n")
    lines.forEach((line, i) => {
      for (const [cat, re] of Object.entries(PATTERNS)) {
        if (cat === "HEX_IN_TSX" && isCss) continue // hex is fine in CSS
        re.lastIndex = 0
        if (re.test(line)) {
          counts[cat]++
          if (samples[cat].length < 8)
            samples[cat].push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`)
        }
      }
    })
  }
}

const LABEL = {
  OFF_BRAND: "OFF-BRAND families (gray/slate/blue…) — never reintroduce",
  RAW_BW: "RAW white/black utilities — review (some legit on canvas/headers)",
  STATE_COLOR: "STATE-COLOR candidates — migrate to --success/-warning/-info/-destructive",
  HEX_IN_TSX: "HEX in components — move to a CSS token",
}

console.log("\n  Design-token scan\n  " + "─".repeat(60))
for (const cat of Object.keys(counts)) {
  console.log(`\n  [${cat}] ${counts[cat]}  — ${LABEL[cat]}`)
  for (const s of samples[cat]) console.log(`      ${s}`)
  if (counts[cat] > samples[cat].length)
    console.log(`      … and ${counts[cat] - samples[cat].length} more`)
}
console.log("\n  " + "─".repeat(60))

if (STRICT && counts.OFF_BRAND > 0) {
  console.error(`\n  ✗ --strict: ${counts.OFF_BRAND} OFF-BRAND color(s) found. Use olive/neutral-olive/semantic tokens.\n`)
  process.exit(1)
}
console.log("  report-only (pass --strict to gate on OFF_BRAND)\n")
