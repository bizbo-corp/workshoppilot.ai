import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';

/**
 * Build the Technical Specifications generation prompt (Markdown output).
 * Produces a comprehensive Technical Specification document derived from all 10 workshop steps.
 */
export function buildTechSpecsPrompt(artifacts: AllWorkshopArtifacts): string {
  const workshopData = JSON.stringify(artifacts, null, 2);

  return `You are a senior software architect with expertise in translating product design thinking into actionable technical specifications. Your task is to produce a comprehensive Technical Specifications document in Markdown format, derived from the design thinking workshop outputs below.

<workshop_data>
${workshopData}
</workshop_data>

INSTRUCTIONS:
- Derive all technical requirements from the workshop data — not from generic assumptions
- If a section's source step artifact is null/missing, omit that section entirely
- Write for an audience of software engineers who will implement this system
- Output ONLY the Markdown document — no preamble, no meta-commentary, no markdown fences
- Target 1500-2500 words for a thorough but practical specification

Produce Technical Specifications with the following sections (omit any section whose source data is null):

# [Product Name] — Technical Specifications

## 1. System Overview
Derive from: concept (Step 9) + feature requirements
Provide a high-level architectural summary of the system: what type of application it is, its primary components, and core technical approach implied by the concept.

## 2. Technical Requirements

### 2.1 Functional Requirements
Derive from: ideation (Step 8) + concept features (Step 9)
List each major functional requirement with an ID, description, and priority. Format as:
- **FR-01** (Priority: High): [requirement description]

### 2.2 Non-Functional Requirements
Derive from: validation confidence/concerns (Step 10) + user expectations in journey mapping (Step 6)
Include performance, scalability, reliability, and usability requirements.

## 3. Data Model
Derive from: persona (Step 5) + journey mapping (Step 6) + concept features (Step 9)
Identify the core data entities the system needs to manage, their key fields, and relationships.
Format each entity as:
**[Entity Name]**
- Fields: [field: type — description]
- Relationships: [relates to other entities]

## 4. API Design
Derive from: feature requirements + user journey stages
Specify key API endpoints required to support core user flows. Format as:
- **[METHOD] /path**: [description of what this endpoint does and what it returns]

## 5. User Interface Specifications
Derive from: journey stages (Step 6) + concept features (Step 9)
Describe the key screens/pages required, their purpose, and essential UI elements.
Format each screen as:
**[Screen Name]**
- Purpose: [what the user accomplishes here]
- Key Elements: [list of essential UI components]

## 6. Integration Requirements
Derive from: concept features (Step 9) + stakeholder mapping (Step 2)
List external services, APIs, or third-party systems the product needs to integrate with, if any are implied by the concept.

## 7. Security & Privacy
Derive from: stakeholder analysis (Step 2) + persona data sensitivity (Step 5)
Specify security requirements related to user data, authentication, authorization, and any regulatory considerations implied by the user profile.

## 8. Performance Requirements
Derive from: user journey pain points (Step 6) + validation expectations (Step 10)
Define measurable performance targets (load times, throughput, availability) derived from user expectations.

## 9. Testing Strategy
Derive from: feature requirements + user journey critical paths
Outline the high-level testing approach for the system's key functional areas.

## 10. Implementation Roadmap
Derive from: validation next steps (Step 10) + feature priorities
Propose a phased implementation plan that delivers value incrementally.

---

CRITICAL RULES:
- Reference SPECIFIC features, entities, and user flows from the workshop data
- Do NOT write generic software architecture content
- Derive API endpoints from actual user flows, not hypothetical ones
- Name entities after real concepts in the product (not generic "User", "Item")
- Omit any section whose source step is null in the workshop_data above`;
}

/**
 * Build the Technical Specifications generation prompt (structured JSON output).
 * Same content as buildTechSpecsPrompt but formatted as machine-readable JSON.
 */
export function buildTechSpecsJsonPrompt(artifacts: AllWorkshopArtifacts): string {
  const workshopData = JSON.stringify(artifacts, null, 2);

  return `You are a senior software architect. Transform the design thinking workshop outputs below into structured Technical Specifications in JSON format.

<workshop_data>
${workshopData}
</workshop_data>

Return ONLY valid JSON matching this exact schema — no markdown fences, no commentary, no preamble:

{
  "title": "string — product name from concept artifact",
  "systemOverview": "string — high-level architectural summary derived from concept + features",
  "requirements": {
    "functional": [
      {
        "id": "string — e.g. FR-01",
        "description": "string — what the system must do",
        "priority": "string — High/Medium/Low"
      }
    ],
    "nonFunctional": [
      {
        "category": "string — e.g. Performance, Security, Scalability",
        "requirement": "string — specific measurable requirement"
      }
    ]
  },
  "dataModel": {
    "entities": [
      {
        "name": "string — entity name",
        "fields": [
          {
            "name": "string — field name",
            "type": "string — data type",
            "description": "string — what this field stores"
          }
        ],
        "relationships": ["string — e.g. 'belongs to User', 'has many Orders'"]
      }
    ]
  },
  "apiDesign": {
    "endpoints": [
      {
        "method": "string — GET/POST/PUT/DELETE/PATCH",
        "path": "string — e.g. /api/users/:id",
        "description": "string — what this endpoint does",
        "requestBody": "string — description of request payload or 'None'",
        "responseBody": "string — description of response payload"
      }
    ]
  },
  "uiSpecifications": {
    "screens": [
      {
        "name": "string — screen name",
        "purpose": "string — what the user accomplishes on this screen",
        "keyElements": ["string — UI element or component 1", "string — UI element 2"]
      }
    ]
  },
  "integrations": [
    {
      "service": "string — service or API name",
      "purpose": "string — why this integration is needed",
      "type": "string — e.g. REST API, OAuth, Webhook, SDK"
    }
  ],
  "security": [
    {
      "area": "string — e.g. Authentication, Data Privacy, Authorization",
      "requirement": "string — specific security requirement"
    }
  ],
  "performance": [
    {
      "metric": "string — what to measure",
      "target": "string — target value e.g. < 200ms, 99.9% uptime"
    }
  ],
  "testingStrategy": {
    "areas": [
      {
        "area": "string — test area e.g. Unit Tests, Integration Tests",
        "approach": "string — how to test this area"
      }
    ]
  },
  "implementationRoadmap": {
    "phases": [
      {
        "name": "string — phase name e.g. Phase 1: MVP",
        "focus": "string — primary goal of this phase",
        "deliverables": ["string — deliverable 1", "string — deliverable 2"]
      }
    ]
  }
}

RULES:
- Use ONLY data from the workshop_data above
- Derive entity names from actual concepts in the product, not generic names
- Omit or use empty arrays for sections whose source step is null
- Return ONLY valid JSON — no markdown code fences, no explanation`;
}
