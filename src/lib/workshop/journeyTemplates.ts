/**
 * Journey Map Templates
 *
 * Each template defines a journey type with a name, description, category,
 * and 3–7 default stages (5 being the sweet spot).
 *
 * Stages are ordered arrays representing the columns of the journey map grid.
 * Each stage gets the standard 7 layers: Actions, Goals, Barriers, Touchpoints,
 * Emotions, Moments of Truth, Opportunities.
 */

export interface JourneyStage {
  name: string;
  description: string;
}

export interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  stages: JourneyStage[];
}

export interface JourneyCategory {
  id: string;
  name: string;
  description: string;
  templates: JourneyTemplate[];
}

// ---------------------------------------------------------------------------
// JOURNEY LAYERS (constant across all templates)
// ---------------------------------------------------------------------------
export const JOURNEY_LAYERS = [
  { id: "actions", name: "Actions", description: "What the person actually does at this stage — observable behavior." },
  { id: "goals", name: "Goals", description: "What they're trying to achieve at this stage." },
  { id: "barriers", name: "Barriers", description: "Obstacles, pain points, or friction they encounter." },
  { id: "touchpoints", name: "Touchpoints", description: "Tools, systems, people, or interfaces they interact with." },
  { id: "emotions", name: "Emotions", description: "How they feel at this stage. Uses traffic light: positive (green), neutral (orange), negative (red)." },
  { id: "moments_of_truth", name: "Moments of Truth", description: "Critical moments where they form strong opinions or make key decisions.", optional: true },
  { id: "opportunities", name: "Opportunities", description: "Potential areas for improvement or intervention.", optional: true },
] as const;

// ---------------------------------------------------------------------------
// ALL JOURNEY TEMPLATES BY CATEGORY
// ---------------------------------------------------------------------------
export const journeyCategories: JourneyCategory[] = [

  // =========================================================================
  // CUSTOMER LIFECYCLE JOURNEYS
  // =========================================================================
  {
    id: "customer-lifecycle",
    name: "Customer Lifecycle Journeys",
    description: "Maps the relationship between a customer and a product or brand, from first contact through long-term engagement.",
    templates: [
      {
        id: "awareness-to-purchase",
        name: "Awareness → Purchase",
        description: "The classic marketing/sales funnel — from first hearing about a product to buying it.",
        category: "customer-lifecycle",
        stages: [
          { name: "Awareness", description: "The person first becomes aware of a need or discovers the product/brand." },
          { name: "Consideration", description: "They research options, compare alternatives, and evaluate fit." },
          { name: "Decision", description: "They narrow down to a final choice and build conviction." },
          { name: "Purchase", description: "They complete the transaction — payment, signup, or commitment." },
          { name: "Post-Purchase", description: "Immediate aftermath — confirmation, delivery, or first impression after buying." },
        ],
      },
      {
        id: "onboarding-first-use",
        name: "Onboarding / First Use",
        description: "The experience of getting started with a product or service for the first time.",
        category: "customer-lifecycle",
        stages: [
          { name: "Welcome", description: "First contact after signup — initial orientation and expectations setting." },
          { name: "Setup", description: "Account creation, configuration, connecting data sources or preferences." },
          { name: "First Task", description: "The person attempts the core action for the first time." },
          { name: "Early Wins", description: "They experience the first moment of value — something works and it feels good." },
          { name: "Habit Formation", description: "They return and begin integrating the product into their routine." },
        ],
      },
      {
        id: "adoption-feature-discovery",
        name: "Adoption / Feature Discovery",
        description: "How a user moves from basic usage to discovering and using deeper features.",
        category: "customer-lifecycle",
        stages: [
          { name: "Core Usage", description: "The person uses the product for its primary function regularly." },
          { name: "Curiosity", description: "They notice or hear about features they haven't tried." },
          { name: "Exploration", description: "They experiment with a new feature or workflow." },
          { name: "Integration", description: "The new feature becomes part of their regular usage pattern." },
          { name: "Mastery", description: "They feel confident and may teach others or customize advanced settings." },
        ],
      },
      {
        id: "retention-renewal",
        name: "Retention / Renewal",
        description: "The journey around staying with a product or service, especially at renewal decision points.",
        category: "customer-lifecycle",
        stages: [
          { name: "Steady Usage", description: "The person is an active user in a stable pattern." },
          { name: "Value Check", description: "Something triggers reflection — a bill, a competitor ad, a frustration." },
          { name: "Evaluation", description: "They weigh the product's value against cost, alternatives, or inertia." },
          { name: "Renewal Decision", description: "They commit to staying, downgrading, or leaving." },
          { name: "Re-engagement", description: "If staying, they may re-engage with renewed intent or adjusted expectations." },
        ],
      },
      {
        id: "upsell-cross-sell",
        name: "Upsell / Cross-sell",
        description: "When an existing customer encounters and evaluates an expanded offering.",
        category: "customer-lifecycle",
        stages: [
          { name: "Trigger", description: "Something highlights a limitation or new possibility — a feature gate, a recommendation, a need." },
          { name: "Awareness of Upgrade", description: "The person learns about the higher tier, add-on, or complementary product." },
          { name: "Evaluation", description: "They assess whether the upgrade is worth the additional cost or effort." },
          { name: "Upgrade Decision", description: "They purchase the upgrade, add-on, or expanded plan." },
          { name: "Value Realization", description: "They experience (or fail to experience) the added value of the upgrade." },
        ],
      },
      {
        id: "winback-reengagement",
        name: "Win-back / Re-engagement",
        description: "Bringing a lapsed or churned user back to the product.",
        category: "customer-lifecycle",
        stages: [
          { name: "Lapse", description: "The person has stopped using the product — activity has dropped off." },
          { name: "Re-contact", description: "They receive an outreach — email, notification, ad — or encounter a trigger." },
          { name: "Reconsideration", description: "They evaluate whether to come back, weighing past experience against current need." },
          { name: "Return", description: "They re-engage with the product — logging back in, re-subscribing." },
          { name: "Re-activation", description: "They rebuild usage habits and assess whether things have improved." },
        ],
      },
      {
        id: "churn-offboarding",
        name: "Churn / Offboarding",
        description: "The experience of leaving a product or service.",
        category: "customer-lifecycle",
        stages: [
          { name: "Disengagement", description: "Usage drops, frustrations accumulate, or needs change." },
          { name: "Decision to Leave", description: "The person decides they're done — the final straw or a calculated choice." },
          { name: "Cancellation", description: "They navigate the cancellation or offboarding process." },
          { name: "Data & Transition", description: "They export data, find alternatives, and handle the switch." },
          { name: "Post-Exit", description: "Life after the product — do they regret it, feel relief, or barely notice?" },
        ],
      },
      {
        id: "referral-advocacy",
        name: "Referral / Advocacy",
        description: "When a satisfied user recommends the product to others.",
        category: "customer-lifecycle",
        stages: [
          { name: "Delight Moment", description: "The person experiences something genuinely impressive or valuable." },
          { name: "Social Trigger", description: "A conversation, question, or situation creates an opening to recommend." },
          { name: "Sharing", description: "They tell someone about the product — word of mouth, social post, or formal referral." },
          { name: "Follow-through", description: "The referred person acts on the recommendation — signs up, tries it out." },
          { name: "Mutual Reward", description: "Both parties experience the outcome — the referrer feels validated, the new user begins their journey." },
        ],
      },
    ],
  },

  // =========================================================================
  // SUPPORT & PROBLEM-SOLVING JOURNEYS
  // =========================================================================
  {
    id: "support-problem-solving",
    name: "Support & Problem-Solving Journeys",
    description: "Maps experiences where something goes wrong and the person seeks resolution.",
    templates: [
      {
        id: "troubleshooting-issue-resolution",
        name: "Troubleshooting / Issue Resolution",
        description: "From encountering a problem to getting it fixed.",
        category: "support-problem-solving",
        stages: [
          { name: "Problem Encountered", description: "Something breaks, doesn't work as expected, or causes confusion." },
          { name: "Self-Service Attempt", description: "The person tries to fix it themselves — searching docs, FAQs, forums." },
          { name: "Contact Support", description: "They reach out for help — chat, email, phone, or ticket." },
          { name: "Resolution Process", description: "Working with support to diagnose and fix the issue." },
          { name: "Resolution & Recovery", description: "The issue is resolved and they return to normal usage — or it isn't, and frustration deepens." },
        ],
      },
      {
        id: "complaint-escalation",
        name: "Complaint / Escalation",
        description: "When a problem isn't resolved and the person escalates their dissatisfaction.",
        category: "support-problem-solving",
        stages: [
          { name: "Initial Frustration", description: "A negative experience occurs — service failure, unmet expectation, or repeated issue." },
          { name: "First Complaint", description: "The person voices their dissatisfaction through a support channel." },
          { name: "Inadequate Response", description: "The initial response doesn't resolve the issue or feels dismissive." },
          { name: "Escalation", description: "They push harder — asking for a manager, posting publicly, or threatening to leave." },
          { name: "Resolution or Departure", description: "The complaint is finally addressed satisfactorily, or the person leaves and tells others." },
        ],
      },
      {
        id: "returns-refunds",
        name: "Returns / Refunds",
        description: "The experience of returning a product or requesting a refund.",
        category: "support-problem-solving",
        stages: [
          { name: "Dissatisfaction", description: "The person decides the product or service isn't right — wrong item, poor quality, changed mind." },
          { name: "Policy Lookup", description: "They check return/refund eligibility, deadlines, and conditions." },
          { name: "Initiate Return", description: "They start the return process — form, label, packaging, or request." },
          { name: "Return Logistics", description: "Shipping the item back, dropping it off, or waiting for processing." },
          { name: "Refund & Closure", description: "They receive the refund and form a final impression of the experience." },
        ],
      },
      {
        id: "account-recovery",
        name: "Account Recovery",
        description: "Regaining access to a locked, hacked, or forgotten account.",
        category: "support-problem-solving",
        stages: [
          { name: "Access Failure", description: "The person can't get into their account — forgotten password, lockout, or breach." },
          { name: "Recovery Attempt", description: "They try self-service recovery — password reset, security questions, backup codes." },
          { name: "Identity Verification", description: "They must prove they are who they say they are — documents, support calls, waiting periods." },
          { name: "Access Restored", description: "They regain access and secure their account." },
          { name: "Trust Rebuild", description: "They assess whether they trust the platform with their data going forward." },
        ],
      },
    ],
  },

  // =========================================================================
  // EMPLOYEE JOURNEYS
  // =========================================================================
  {
    id: "employee",
    name: "Employee Journeys",
    description: "Maps the experience of people within an organization, from hiring through departure.",
    templates: [
      {
        id: "recruitment-hiring",
        name: "Recruitment / Hiring",
        description: "From job discovery through to accepted offer.",
        category: "employee",
        stages: [
          { name: "Job Discovery", description: "The candidate finds or is approached about the role." },
          { name: "Application", description: "They submit their application — CV, cover letter, portfolio." },
          { name: "Interview Process", description: "Screening calls, interviews, assessments, and evaluations." },
          { name: "Offer & Negotiation", description: "They receive an offer and negotiate terms." },
          { name: "Acceptance & Pre-boarding", description: "They accept and prepare for day one — paperwork, logistics, anticipation." },
        ],
      },
      {
        id: "employee-onboarding",
        name: "Employee Onboarding",
        description: "A new hire's first weeks and months in a role.",
        category: "employee",
        stages: [
          { name: "Day One", description: "First day — orientation, introductions, setup." },
          { name: "First Week", description: "Getting bearings — tools, processes, team dynamics, information overload." },
          { name: "First Month", description: "Starting to contribute — early tasks, building relationships, asking questions." },
          { name: "Settling In", description: "Gaining confidence, understanding expectations, finding their rhythm." },
          { name: "Productive Contributor", description: "They're up to speed and delivering meaningful work independently." },
        ],
      },
      {
        id: "performance-review",
        name: "Performance Review",
        description: "The experience around formal performance evaluation cycles.",
        category: "employee",
        stages: [
          { name: "Anticipation", description: "The review cycle approaches — anxiety, preparation, reflection." },
          { name: "Self-Assessment", description: "They evaluate their own performance and gather evidence." },
          { name: "Review Meeting", description: "The formal conversation with their manager — feedback, ratings, discussion." },
          { name: "Processing Feedback", description: "They digest what was said — agreement, surprise, disappointment, or motivation." },
          { name: "Action Planning", description: "They create or receive a development plan and move forward." },
        ],
      },
      {
        id: "career-development-promotion",
        name: "Career Development / Promotion",
        description: "Growing within a role or pursuing advancement.",
        category: "employee",
        stages: [
          { name: "Aspiration", description: "The person identifies a growth goal — new skills, a title, a different role." },
          { name: "Skill Building", description: "They invest in development — training, stretch projects, mentorship." },
          { name: "Visibility", description: "They make their contributions and ambitions known to decision-makers." },
          { name: "Opportunity", description: "A promotion, role change, or advancement opportunity arises." },
          { name: "Transition", description: "They step into the new role and navigate the adjustment." },
        ],
      },
      {
        id: "offboarding-exit",
        name: "Offboarding / Exit",
        description: "The experience of leaving a job — voluntarily or otherwise.",
        category: "employee",
        stages: [
          { name: "Decision to Leave", description: "The employee decides to resign, or learns they're being let go." },
          { name: "Notice Period", description: "The transition phase — handovers, goodbye conversations, mixed emotions." },
          { name: "Knowledge Transfer", description: "Documenting work, training replacements, tying up loose ends." },
          { name: "Last Day", description: "Final farewells, returning equipment, exit interview." },
          { name: "Post-Exit", description: "Life after — staying in touch, alumni networks, reflection on the experience." },
        ],
      },
    ],
  },

  // =========================================================================
  // PRODUCT & SERVICE JOURNEYS
  // =========================================================================
  {
    id: "product-service",
    name: "Product & Service Journeys",
    description: "Maps processes around building, delivering, or changing products and services.",
    templates: [
      {
        id: "product-development",
        name: "Product Development (idea → launch)",
        description: "Taking a product from concept through to market.",
        category: "product-service",
        stages: [
          { name: "Ideation", description: "Generating and validating the initial concept." },
          { name: "Research & Scoping", description: "Understanding the market, users, and feasibility." },
          { name: "Design & Build", description: "Creating the product — prototyping, development, iteration." },
          { name: "Testing & Validation", description: "User testing, QA, beta programs, and refinement." },
          { name: "Launch", description: "Going to market — release, marketing, and initial reception." },
        ],
      },
      {
        id: "service-delivery",
        name: "Service Delivery (order → fulfillment)",
        description: "The experience of ordering and receiving a service.",
        category: "product-service",
        stages: [
          { name: "Order Placed", description: "The customer commits to the service — booking, purchasing, requesting." },
          { name: "Confirmation & Scheduling", description: "They receive confirmation and any scheduling or logistics details." },
          { name: "Service Execution", description: "The service is performed or delivered." },
          { name: "Quality Check", description: "The customer evaluates the result — does it meet expectations?" },
          { name: "Completion & Follow-up", description: "Final handoff, payment, feedback request, or ongoing relationship." },
        ],
      },
      {
        id: "migration-platform-switch",
        name: "Migration / Platform Switch",
        description: "Moving from one tool, platform, or system to another.",
        category: "product-service",
        stages: [
          { name: "Trigger to Switch", description: "Something makes the current solution untenable — cost, features, frustration." },
          { name: "Alternative Evaluation", description: "Researching and comparing replacement options." },
          { name: "Migration Planning", description: "Mapping data, workflows, and dependencies for the switch." },
          { name: "Data Transfer & Setup", description: "Moving data, configuring the new system, and testing." },
          { name: "Cutover & Adjustment", description: "Going live on the new platform and adapting to the change." },
        ],
      },
      {
        id: "upgrade-plan-change",
        name: "Upgrade / Plan Change",
        description: "Changing subscription tiers, plans, or service levels.",
        category: "product-service",
        stages: [
          { name: "Need Recognition", description: "The person hits a limit or identifies a need that their current plan doesn't cover." },
          { name: "Options Review", description: "They compare available plans, tiers, or packages." },
          { name: "Cost-Benefit Analysis", description: "They weigh the upgrade cost against the expected value." },
          { name: "Plan Change", description: "They execute the upgrade or downgrade." },
          { name: "Adjustment", description: "They adapt to the new plan's features, limits, or pricing." },
        ],
      },
    ],
  },

  // =========================================================================
  // HEALTH & PERSONAL JOURNEYS
  // =========================================================================
  {
    id: "health-personal",
    name: "Health & Personal Journeys",
    description: "Maps personal experiences around health, learning, behavior, and financial goals.",
    templates: [
      {
        id: "patient-journey",
        name: "Patient Journey",
        description: "From symptoms through diagnosis, treatment, and recovery.",
        category: "health-personal",
        stages: [
          { name: "Symptom Awareness", description: "The person notices something is wrong — pain, discomfort, or concern." },
          { name: "Seeking Help", description: "They decide to see a professional — booking, waiting, navigating the system." },
          { name: "Diagnosis", description: "Tests, consultations, and receiving a diagnosis." },
          { name: "Treatment", description: "Following a treatment plan — medication, therapy, procedures, lifestyle changes." },
          { name: "Recovery & Management", description: "Healing, monitoring, follow-ups, and adapting to a new normal." },
        ],
      },
      {
        id: "learning-education",
        name: "Learning / Education",
        description: "From enrolling in a learning experience through to applying knowledge.",
        category: "health-personal",
        stages: [
          { name: "Motivation", description: "The person identifies a learning goal or requirement." },
          { name: "Enrollment", description: "They sign up for a course, program, or self-directed learning path." },
          { name: "Active Learning", description: "Engaging with content — lectures, exercises, practice, struggle." },
          { name: "Assessment", description: "Testing understanding — exams, projects, portfolio, or self-evaluation." },
          { name: "Application", description: "Applying what they learned in the real world." },
        ],
      },
      {
        id: "behavior-change",
        name: "Behavior Change",
        description: "The journey of changing a habit or adopting a new behavior.",
        category: "health-personal",
        stages: [
          { name: "Pre-contemplation", description: "They're not yet aware of the need to change, or are in denial." },
          { name: "Contemplation", description: "They recognize the need and start weighing pros and cons." },
          { name: "Preparation", description: "They commit to change and make a plan — tools, support, environment." },
          { name: "Action", description: "They actively practice the new behavior — effort, willpower, setbacks." },
          { name: "Maintenance", description: "The new behavior becomes routine — but relapse risk remains." },
        ],
      },
      {
        id: "financial-planning",
        name: "Financial Planning",
        description: "Setting and working toward a financial goal.",
        category: "health-personal",
        stages: [
          { name: "Goal Setting", description: "The person defines what they want financially — savings target, debt payoff, investment." },
          { name: "Assessment", description: "They evaluate their current financial situation — income, expenses, assets, debts." },
          { name: "Planning", description: "They create a strategy — budget, investment plan, timeline." },
          { name: "Execution", description: "They follow the plan — saving, investing, cutting expenses, earning more." },
          { name: "Monitoring & Adjustment", description: "They track progress and adjust the plan as circumstances change." },
        ],
      },
    ],
  },

  // =========================================================================
  // B2B-SPECIFIC JOURNEYS
  // =========================================================================
  {
    id: "b2b",
    name: "B2B-Specific Journeys",
    description: "Maps business-to-business processes involving procurement, partnerships, and enterprise relationships.",
    templates: [
      {
        id: "vendor-evaluation-procurement",
        name: "Vendor Evaluation / Procurement",
        description: "Evaluating and selecting a business vendor or supplier.",
        category: "b2b",
        stages: [
          { name: "Need Identification", description: "The business identifies a gap or requirement that needs an external solution." },
          { name: "Market Scan", description: "Researching vendors — RFPs, demos, referrals, comparison matrices." },
          { name: "Evaluation & Shortlisting", description: "Deep evaluation of top candidates — trials, reference checks, security reviews." },
          { name: "Negotiation & Approval", description: "Contract terms, pricing negotiation, and internal approval processes." },
          { name: "Selection & Contracting", description: "Final vendor selected, contract signed, kickoff planned." },
        ],
      },
      {
        id: "implementation-integration",
        name: "Implementation / Integration",
        description: "Deploying a new B2B tool or system within an organization.",
        category: "b2b",
        stages: [
          { name: "Kickoff", description: "Initial planning meeting — timelines, stakeholders, success criteria." },
          { name: "Configuration", description: "Setting up the system — customization, data import, integrations." },
          { name: "Testing", description: "UAT, pilot groups, and validation against requirements." },
          { name: "Rollout", description: "Deploying to the wider organization — training, change management, support." },
          { name: "Stabilization", description: "Resolving initial issues, optimizing, and reaching steady state." },
        ],
      },
      {
        id: "contract-renewal-negotiation",
        name: "Contract Renewal / Negotiation",
        description: "The process of renewing or renegotiating a business contract.",
        category: "b2b",
        stages: [
          { name: "Renewal Trigger", description: "The contract end date approaches or a review clause activates." },
          { name: "Performance Review", description: "Both parties assess the relationship — ROI, satisfaction, issues." },
          { name: "Negotiation", description: "Terms are discussed — pricing, scope, SLAs, new requirements." },
          { name: "Decision", description: "Renew, modify, or terminate the agreement." },
          { name: "New Term Begins", description: "Updated contract takes effect, expectations are reset." },
        ],
      },
      {
        id: "partner-onboarding",
        name: "Partner Onboarding",
        description: "Bringing a new business partner into an ecosystem or program.",
        category: "b2b",
        stages: [
          { name: "Partner Discovery", description: "Identifying and vetting a potential partner." },
          { name: "Agreement", description: "Formalizing the partnership — contracts, terms, mutual commitments." },
          { name: "Enablement", description: "Training, certification, and access provisioning for the partner." },
          { name: "First Engagement", description: "The partner's first customer interaction or joint project." },
          { name: "Ongoing Collaboration", description: "Regular cadence of communication, joint planning, and performance tracking." },
        ],
      },
    ],
  },

  // =========================================================================
  // CIVIC / PUBLIC SECTOR
  // =========================================================================
  {
    id: "civic-public-sector",
    name: "Civic / Public Sector",
    description: "Maps citizen and organizational experiences with government services and regulatory processes.",
    templates: [
      {
        id: "citizen-service",
        name: "Citizen Service",
        description: "Applying for and receiving a government service — permits, benefits, licenses.",
        category: "civic-public-sector",
        stages: [
          { name: "Need Awareness", description: "The citizen learns they need to interact with a government service." },
          { name: "Information Gathering", description: "They research requirements, eligibility, and documentation needed." },
          { name: "Application", description: "They complete and submit the application — forms, documents, fees." },
          { name: "Processing & Waiting", description: "The application is reviewed — status checks, additional requests, delays." },
          { name: "Outcome & Follow-up", description: "They receive approval/denial and any follow-up actions required." },
        ],
      },
      {
        id: "compliance-regulatory",
        name: "Compliance / Regulatory",
        description: "Meeting regulatory requirements — filing, auditing, and maintaining compliance.",
        category: "civic-public-sector",
        stages: [
          { name: "Requirement Awareness", description: "The organization learns about a regulation or compliance obligation." },
          { name: "Gap Assessment", description: "They evaluate their current state against the requirements." },
          { name: "Implementation", description: "Making changes — policies, processes, documentation, controls." },
          { name: "Submission & Audit", description: "Filing required documentation or undergoing audit/inspection." },
          { name: "Maintenance", description: "Ongoing compliance monitoring, updates, and renewal cycles." },
        ],
      },
    ],
  },

  // =========================================================================
  // TASK / WORKFLOW JOURNEYS
  // =========================================================================
  {
    id: "task-workflow",
    name: "Product Task / Workflow Journeys",
    description: "Maps how a user accomplishes a specific task or workflow within a product. These are action-oriented and repeatable.",
    templates: [
      {
        id: "input-process-output",
        name: "Input → Process → Output",
        description: "A linear workflow where raw information is received, processed, and produces a result.",
        category: "task-workflow",
        stages: [
          { name: "Receive Input", description: "Raw data, content, or a request arrives from an external source." },
          { name: "Validate & Parse", description: "The input is checked for quality, formatted, and prepared for processing." },
          { name: "Process", description: "The core transformation happens — calculation, conversion, enrichment." },
          { name: "Review Output", description: "The result is checked for accuracy and completeness." },
          { name: "Deliver", description: "The output is sent, saved, or published to its destination." },
        ],
      },
      {
        id: "capture-organize-act",
        name: "Capture → Organize → Act",
        description: "Grabbing information from various sources, structuring it, and taking action on it.",
        category: "task-workflow",
        stages: [
          { name: "Capture", description: "Information is grabbed from a source — message, email, voice note, photo." },
          { name: "Categorize", description: "The captured item is tagged, labeled, or sorted into the right bucket." },
          { name: "Enrich", description: "Additional context is added — dates, locations, links, related items." },
          { name: "Prioritize", description: "The item is ranked or scheduled relative to other items." },
          { name: "Act", description: "The person takes action — sets a reminder, completes the task, delegates." },
        ],
      },
      {
        id: "collect-review-publish",
        name: "Collect → Review → Publish",
        description: "Aggregating content from multiple sources, curating it, and sharing the result.",
        category: "task-workflow",
        stages: [
          { name: "Collect", description: "Content is gathered from multiple sources or contributors." },
          { name: "Aggregate", description: "Collected items are merged and deduplicated into a unified view." },
          { name: "Review & Edit", description: "The collection is reviewed for quality, accuracy, and completeness." },
          { name: "Approve", description: "Final sign-off before publishing — stakeholder review or personal confirmation." },
          { name: "Publish & Share", description: "The curated content is published, shared, or distributed." },
        ],
      },
      {
        id: "trigger-triage-resolve",
        name: "Trigger → Triage → Resolve",
        description: "A reactive workflow where something demands attention, gets assessed, and is handled.",
        category: "task-workflow",
        stages: [
          { name: "Trigger", description: "An event occurs that demands attention — notification, alert, request." },
          { name: "Assess", description: "Quick evaluation — how urgent is this? What's the impact?" },
          { name: "Triage", description: "The item is routed to the right response — self, delegate, defer, or ignore." },
          { name: "Resolve", description: "The appropriate action is taken to address the trigger." },
          { name: "Close & Learn", description: "The item is marked complete, and any patterns or improvements are noted." },
        ],
      },
    ],
  },

  // =========================================================================
  // PRODUCT USAGE JOURNEYS
  // =========================================================================
  {
    id: "product-usage",
    name: "Product Usage Journeys",
    description: "Maps how users interact with a product across different operational modes — from setup to optimization.",
    templates: [
      {
        id: "setup-configuration",
        name: "Setup / Configuration Journey",
        description: "The experience of configuring a product to match personal needs and preferences.",
        category: "product-usage",
        stages: [
          { name: "Requirements Gathering", description: "The user identifies what they need the product to do for them." },
          { name: "Initial Configuration", description: "Setting core preferences — accounts, defaults, permissions." },
          { name: "Customization", description: "Tailoring the experience — themes, layouts, notification preferences." },
          { name: "Testing", description: "Verifying the setup works as expected with real use cases." },
          { name: "Go Live", description: "Committing to the configuration and starting regular use." },
        ],
      },
      {
        id: "core-task",
        name: "Core Task Journey",
        description: "The primary thing the product was built for — the main job-to-be-done.",
        category: "product-usage",
        stages: [
          { name: "Intent", description: "The user comes to the product with a specific goal in mind." },
          { name: "Navigation", description: "They find the right feature or starting point for their task." },
          { name: "Execution", description: "They perform the core action — creating, editing, sending, completing." },
          { name: "Confirmation", description: "They verify the task was completed correctly." },
          { name: "Exit", description: "They leave the product or transition to a different task." },
        ],
      },
      {
        id: "exception-handling",
        name: "Exception Handling Journey",
        description: "When things go wrong during product use and require manual intervention.",
        category: "product-usage",
        stages: [
          { name: "Error Encountered", description: "Something unexpected happens — an error, conflict, or failure." },
          { name: "Diagnosis", description: "The user tries to understand what went wrong and why." },
          { name: "Workaround Search", description: "They look for a way to fix it — undo, retry, alternative path." },
          { name: "Resolution", description: "They fix the issue manually or with help." },
          { name: "Recovery", description: "They return to their task and verify everything is back on track." },
        ],
      },
      {
        id: "optimization",
        name: "Optimization Journey",
        description: "When a user refines their workflow to be more efficient over time.",
        category: "product-usage",
        stages: [
          { name: "Friction Awareness", description: "The user notices inefficiency — too many clicks, repetitive steps, slow processes." },
          { name: "Research", description: "They look for better ways — help docs, power user tips, settings they missed." },
          { name: "Experimentation", description: "They try shortcuts, automations, or workflow changes." },
          { name: "Adoption", description: "The improvement sticks — they integrate it into their regular workflow." },
          { name: "Sharing", description: "They may share the optimization with teammates or the community." },
        ],
      },
      {
        id: "integration",
        name: "Integration Journey",
        description: "Connecting the product with other tools in the user's ecosystem.",
        category: "product-usage",
        stages: [
          { name: "Integration Need", description: "The user realizes they need the product to talk to another tool." },
          { name: "Discovery", description: "They find available integrations — marketplace, settings, documentation." },
          { name: "Connection", description: "They set up the integration — authentication, permissions, mapping." },
          { name: "Validation", description: "They test that data flows correctly between systems." },
          { name: "Ongoing Management", description: "Monitoring the integration, handling sync errors, updating as tools change." },
        ],
      },
      {
        id: "collaboration",
        name: "Collaboration Journey",
        description: "When multiple people use the product together toward a shared goal.",
        category: "product-usage",
        stages: [
          { name: "Invite / Share", description: "One user brings others into the product or a shared workspace." },
          { name: "Onboard Collaborators", description: "New participants get oriented — permissions, context, expectations." },
          { name: "Collaborative Work", description: "Multiple people contribute — editing, commenting, assigning, discussing." },
          { name: "Coordination", description: "Managing who does what — avoiding conflicts, staying aligned." },
          { name: "Outcome", description: "The shared goal is achieved and the collaboration wraps up or continues." },
        ],
      },
      {
        id: "review-reporting",
        name: "Review / Reporting Journey",
        description: "Looking back at what happened — dashboards, analytics, retrospectives.",
        category: "product-usage",
        stages: [
          { name: "Trigger to Review", description: "Something prompts a look back — end of period, a question, a stakeholder request." },
          { name: "Data Gathering", description: "Pulling together the relevant data — logs, metrics, history." },
          { name: "Analysis", description: "Making sense of the data — trends, anomalies, insights." },
          { name: "Reporting", description: "Packaging findings into a shareable format — dashboard, report, presentation." },
          { name: "Action from Insights", description: "Using what was learned to make decisions or changes." },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// FLAT LIST HELPER — for easy lookup/search
// ---------------------------------------------------------------------------
export const allJourneyTemplates: JourneyTemplate[] = journeyCategories.flatMap(
  (cat) => cat.templates
);

export function getTemplateById(id: string): JourneyTemplate | undefined {
  return allJourneyTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(categoryId: string): JourneyTemplate[] {
  return allJourneyTemplates.filter((t) => t.category === categoryId);
}

export function searchTemplates(query: string): JourneyTemplate[] {
  const lower = query.toLowerCase();
  return allJourneyTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.category.toLowerCase().includes(lower)
  );
}
