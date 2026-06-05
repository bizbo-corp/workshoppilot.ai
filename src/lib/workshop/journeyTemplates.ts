/**
 * Journey Map Templates
 *
 * Each template defines a journey type with a name, description, category,
 * and 3–7 default stages (5 being the sweet spot).
 *
 * Stages are ordered arrays representing the columns of the journey map grid.
 * Each stage gets the standard 7 layers: Actions, Goals, Barriers, Touchpoints,
 * Emotions, Moments of Truth, Opportunities.
 *
 * Stage names are written in plain, everyday English on purpose — the people
 * using this are usually founders and first-timers, not UX consultants. Keep
 * that register if you add or edit templates ("Sort by priority", not "Triage").
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
          { name: "After the Purchase", description: "Immediate aftermath — confirmation, delivery, or first impression after buying." },
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
          { name: "Building the Habit", description: "They return and begin working the product into their routine." },
        ],
      },
      {
        id: "adoption-feature-discovery",
        name: "Adoption / Feature Discovery",
        description: "How a user moves from basic usage to discovering and using deeper features.",
        category: "customer-lifecycle",
        stages: [
          { name: "Regular Use", description: "The person uses the product for its primary function regularly." },
          { name: "Curiosity", description: "They notice or hear about features they haven't tried." },
          { name: "Try It Out", description: "They experiment with a new feature or workflow." },
          { name: "Part of the Routine", description: "The new feature becomes part of how they regularly work." },
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
          { name: "The Nudge", description: "Something highlights a limit or a new possibility — a feature gate, a tip, a need." },
          { name: "Learn About the Upgrade", description: "The person learns about the higher tier, add-on, or complementary product." },
          { name: "Weigh It Up", description: "They assess whether the upgrade is worth the additional cost or effort." },
          { name: "Decide to Upgrade", description: "They purchase the upgrade, add-on, or expanded plan." },
          { name: "Seeing the Payoff", description: "They experience (or fail to experience) the added value of the upgrade." },
        ],
      },
      {
        id: "winback-reengagement",
        name: "Win-back / Re-engagement",
        description: "Bringing a lapsed or churned user back to the product.",
        category: "customer-lifecycle",
        stages: [
          { name: "Drifting Off", description: "The person has stopped using the product — activity has dropped away." },
          { name: "Re-contact", description: "They receive an outreach — email, notification, ad — or encounter a trigger." },
          { name: "Reconsider", description: "They weigh whether to come back, balancing past experience against current need." },
          { name: "Come Back", description: "They re-engage with the product — logging back in, re-subscribing." },
          { name: "Back in the Habit", description: "They rebuild usage habits and judge whether things have improved." },
        ],
      },
      {
        id: "churn-offboarding",
        name: "Churn / Offboarding",
        description: "The experience of leaving a product or service.",
        category: "customer-lifecycle",
        stages: [
          { name: "Drifting Away", description: "Usage drops, frustrations pile up, or needs change." },
          { name: "Decide to Leave", description: "The person decides they're done — the final straw or a calculated choice." },
          { name: "Cancel", description: "They navigate the cancellation or offboarding process." },
          { name: "Move the Data", description: "They export data, find alternatives, and handle the switch." },
          { name: "After Leaving", description: "Life after the product — do they regret it, feel relief, or barely notice?" },
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
        description: "From hitting a problem to getting it fixed.",
        category: "support-problem-solving",
        stages: [
          { name: "Something Breaks", description: "Something breaks, doesn't work as expected, or causes confusion." },
          { name: "Try to Fix It Themselves", description: "The person tries to fix it on their own — searching docs, FAQs, forums." },
          { name: "Contact Support", description: "They reach out for help — chat, email, phone, or ticket." },
          { name: "Working It Out", description: "Working with support to figure out and fix the issue." },
          { name: "Fixed & Back to Normal", description: "The issue is resolved and they return to normal usage — or it isn't, and frustration deepens." },
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
          { name: "Unsatisfying Response", description: "The first response doesn't resolve the issue or feels dismissive." },
          { name: "Pushing Harder", description: "They escalate — asking for a manager, posting publicly, or threatening to leave." },
          { name: "Resolved or Gone", description: "The complaint is finally addressed satisfactorily, or the person leaves and tells others." },
        ],
      },
      {
        id: "returns-refunds",
        name: "Returns / Refunds",
        description: "The experience of returning a product or requesting a refund.",
        category: "support-problem-solving",
        stages: [
          { name: "Not Happy With It", description: "The person decides the product or service isn't right — wrong item, poor quality, changed mind." },
          { name: "Check the Policy", description: "They check return/refund eligibility, deadlines, and conditions." },
          { name: "Start the Return", description: "They start the return process — form, label, packaging, or request." },
          { name: "Send It Back", description: "Shipping the item back, dropping it off, or waiting for processing." },
          { name: "Refund & Wrap Up", description: "They receive the refund and form a final impression of the experience." },
        ],
      },
      {
        id: "account-recovery",
        name: "Account Recovery",
        description: "Regaining access to a locked, hacked, or forgotten account.",
        category: "support-problem-solving",
        stages: [
          { name: "Locked Out", description: "The person can't get into their account — forgotten password, lockout, or breach." },
          { name: "Try to Recover", description: "They try self-service recovery — password reset, security questions, backup codes." },
          { name: "Prove It's You", description: "They must prove they are who they say they are — documents, support calls, waiting periods." },
          { name: "Back In", description: "They regain access and secure their account." },
          { name: "Rebuilding Trust", description: "They judge whether they still trust the platform with their data going forward." },
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
        description: "From finding a job through to an accepted offer.",
        category: "employee",
        stages: [
          { name: "Find the Job", description: "The candidate finds or is approached about the role." },
          { name: "Apply", description: "They submit their application — CV, cover letter, portfolio." },
          { name: "Interviews", description: "Screening calls, interviews, assessments, and evaluations." },
          { name: "Offer & Negotiate", description: "They receive an offer and negotiate terms." },
          { name: "Accept & Get Ready", description: "They accept and prepare for day one — paperwork, logistics, anticipation." },
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
          { name: "Up to Speed", description: "They're fully ramped and delivering meaningful work independently." },
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
          { name: "Taking In Feedback", description: "They digest what was said — agreement, surprise, disappointment, or motivation." },
          { name: "Planning Next Steps", description: "They create or receive a development plan and move forward." },
        ],
      },
      {
        id: "career-development-promotion",
        name: "Career Development / Promotion",
        description: "Growing within a role or pursuing advancement.",
        category: "employee",
        stages: [
          { name: "Aspiration", description: "The person identifies a growth goal — new skills, a title, a different role." },
          { name: "Building Skills", description: "They invest in development — training, stretch projects, mentorship." },
          { name: "Getting Noticed", description: "They make their contributions and ambitions known to decision-makers." },
          { name: "Opportunity", description: "A promotion, role change, or advancement opportunity arises." },
          { name: "Stepping Up", description: "They step into the new role and navigate the adjustment." },
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
          { name: "Hand Over", description: "Documenting work, training a replacement, and tying up loose ends." },
          { name: "Last Day", description: "Final farewells, returning equipment, exit interview." },
          { name: "After They Leave", description: "Life after — staying in touch, alumni networks, reflection on the experience." },
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
        description: "Taking a product from idea through to launch.",
        category: "product-service",
        stages: [
          { name: "Spark the Idea", description: "Generating and pressure-testing the initial concept." },
          { name: "Research & Scope", description: "Understanding the market, users, and what's feasible." },
          { name: "Design & Build", description: "Creating the product — prototyping, development, iteration." },
          { name: "Test & Refine", description: "User testing, QA, beta programs, and polishing." },
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
          { name: "Service Happens", description: "The service is performed or delivered." },
          { name: "Quality Check", description: "The customer evaluates the result — does it meet expectations?" },
          { name: "Wrap Up & Follow-up", description: "Final handoff, payment, feedback request, or ongoing relationship." },
        ],
      },
      {
        id: "migration-platform-switch",
        name: "Migration / Platform Switch",
        description: "Moving from one tool, platform, or system to another.",
        category: "product-service",
        stages: [
          { name: "Reason to Switch", description: "Something makes the current solution untenable — cost, missing features, frustration." },
          { name: "Compare Options", description: "Researching and comparing replacement options." },
          { name: "Plan the Move", description: "Mapping data, workflows, and dependencies for the switch." },
          { name: "Move & Set Up", description: "Moving data, configuring the new system, and testing." },
          { name: "Go Live & Settle In", description: "Going live on the new platform and adapting to the change." },
        ],
      },
      {
        id: "upgrade-plan-change",
        name: "Upgrade / Plan Change",
        description: "Changing subscription tiers, plans, or service levels.",
        category: "product-service",
        stages: [
          { name: "Hitting a Limit", description: "The person hits a limit or finds a need their current plan doesn't cover." },
          { name: "Compare Plans", description: "They compare available plans, tiers, or packages." },
          { name: "Is It Worth It?", description: "They weigh the upgrade cost against the expected value." },
          { name: "Change the Plan", description: "They execute the upgrade or downgrade." },
          { name: "Adjusting", description: "They adapt to the new plan's features, limits, or pricing." },
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
          { name: "Noticing Symptoms", description: "The person notices something is wrong — pain, discomfort, or concern." },
          { name: "Seeking Help", description: "They decide to see a professional — booking, waiting, navigating the system." },
          { name: "Diagnosis", description: "Tests, consultations, and receiving a diagnosis." },
          { name: "Treatment", description: "Following a treatment plan — medication, therapy, procedures, lifestyle changes." },
          { name: "Recovery & Managing It", description: "Healing, monitoring, follow-ups, and adapting to a new normal." },
        ],
      },
      {
        id: "learning-education",
        name: "Learning / Education",
        description: "From signing up to learn something through to using what you learned.",
        category: "health-personal",
        stages: [
          { name: "Motivation", description: "The person identifies a learning goal or requirement." },
          { name: "Signing Up", description: "They sign up for a course, program, or self-directed learning path." },
          { name: "Learning", description: "Engaging with content — lectures, exercises, practice, struggle." },
          { name: "Testing Understanding", description: "Checking what stuck — exams, projects, portfolio, or self-evaluation." },
          { name: "Putting It to Use", description: "Applying what they learned in the real world." },
        ],
      },
      {
        id: "behavior-change",
        name: "Behavior Change",
        description: "The journey of changing a habit or adopting a new behavior.",
        category: "health-personal",
        stages: [
          { name: "Not Yet Aware", description: "They're not thinking about changing yet — unaware or in denial." },
          { name: "Thinking About It", description: "They recognise the need and start weighing the pros and cons." },
          { name: "Getting Ready", description: "They commit and make a plan — tools, support, and environment." },
          { name: "Doing It", description: "They actively practise the new behaviour — effort, willpower, and setbacks." },
          { name: "Keeping It Up", description: "The new behaviour becomes routine — though slipping back is still a risk." },
        ],
      },
      {
        id: "financial-planning",
        name: "Financial Planning",
        description: "Setting and working toward a financial goal.",
        category: "health-personal",
        stages: [
          { name: "Setting the Goal", description: "The person defines what they want financially — savings target, debt payoff, investment." },
          { name: "Where They Stand", description: "They take stock of their current finances — income, expenses, assets, debts." },
          { name: "Making a Plan", description: "They create a strategy — budget, investment plan, timeline." },
          { name: "Following Through", description: "They follow the plan — saving, investing, cutting expenses, earning more." },
          { name: "Tracking & Adjusting", description: "They track progress and adjust the plan as circumstances change." },
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
          { name: "Spot the Need", description: "The business identifies a gap or requirement that needs an outside solution." },
          { name: "Research Options", description: "Researching vendors — demos, referrals, and side-by-side comparisons." },
          { name: "Narrow It Down", description: "A deeper look at the top candidates — trials, reference checks, security reviews." },
          { name: "Negotiate & Approve", description: "Contract terms, pricing negotiation, and internal sign-off." },
          { name: "Pick & Sign", description: "Final vendor selected, contract signed, kickoff planned." },
        ],
      },
      {
        id: "implementation-integration",
        name: "Implementation / Integration",
        description: "Deploying a new B2B tool or system within an organization.",
        category: "b2b",
        stages: [
          { name: "Kickoff", description: "Initial planning meeting — timelines, stakeholders, success criteria." },
          { name: "Set It Up", description: "Setting up the system — customization, data import, integrations." },
          { name: "Test It", description: "Trial runs with a pilot group to check it meets the requirements." },
          { name: "Roll It Out", description: "Deploying to the wider organization — training, change management, support." },
          { name: "Settle In", description: "Ironing out early issues, fine-tuning, and reaching a steady state." },
        ],
      },
      {
        id: "contract-renewal-negotiation",
        name: "Contract Renewal / Negotiation",
        description: "The process of renewing or renegotiating a business contract.",
        category: "b2b",
        stages: [
          { name: "Renewal Comes Up", description: "The contract end date approaches or a review clause kicks in." },
          { name: "Review How It Went", description: "Both parties assess the relationship — return on investment, satisfaction, issues." },
          { name: "Negotiate", description: "Terms are discussed — pricing, scope, service levels, new requirements." },
          { name: "Decide", description: "Renew, modify, or terminate the agreement." },
          { name: "New Term Starts", description: "Updated contract takes effect, expectations are reset." },
        ],
      },
      {
        id: "partner-onboarding",
        name: "Partner Onboarding",
        description: "Bringing a new business partner into an ecosystem or program.",
        category: "b2b",
        stages: [
          { name: "Find the Partner", description: "Identifying and vetting a potential partner." },
          { name: "Agreement", description: "Formalizing the partnership — contracts, terms, mutual commitments." },
          { name: "Getting Them Ready", description: "Training, certification, and access setup for the partner." },
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
          { name: "Realizing You Need It", description: "The citizen learns they need to interact with a government service." },
          { name: "Figuring Out the Rules", description: "They research requirements, eligibility, and documentation needed." },
          { name: "Application", description: "They complete and submit the application — forms, documents, fees." },
          { name: "Waiting for a Decision", description: "The application is reviewed — status checks, additional requests, delays." },
          { name: "Outcome & Follow-up", description: "They receive approval/denial and any follow-up actions required." },
        ],
      },
      {
        id: "compliance-regulatory",
        name: "Compliance / Regulatory",
        description: "Meeting regulatory requirements — filing, auditing, and maintaining compliance.",
        category: "civic-public-sector",
        stages: [
          { name: "Learning the Requirement", description: "The organization learns about a regulation or compliance obligation." },
          { name: "Checking the Gaps", description: "They evaluate their current state against the requirements." },
          { name: "Making Changes", description: "Updating policies, processes, documentation, and controls." },
          { name: "Filing & Audit", description: "Filing required documentation or undergoing audit/inspection." },
          { name: "Staying Compliant", description: "Ongoing compliance monitoring, updates, and renewal cycles." },
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
        description: "A repeatable workflow where information comes in, gets worked on, and produces a result.",
        category: "task-workflow",
        stages: [
          { name: "Information Comes In", description: "Raw data, content, or a request arrives from somewhere outside." },
          { name: "Check & Clean Up", description: "The incoming info is checked for quality and tidied up so it's ready to use." },
          { name: "Do the Work", description: "The main work happens — the heavy lifting that turns the input into a result." },
          { name: "Check the Result", description: "The result is double-checked for accuracy and completeness." },
          { name: "Send It Out", description: "The finished result is sent, saved, or shared where it needs to go." },
        ],
      },
      {
        id: "capture-organize-act",
        name: "Capture → Organize → Act",
        description: "Grabbing information from all over, tidying it up, and acting on it.",
        category: "task-workflow",
        stages: [
          { name: "Grab It", description: "Information is grabbed from a source — a message, email, voice note, or photo." },
          { name: "Sort It", description: "The captured item is tagged or filed into the right bucket." },
          { name: "Add Details", description: "Extra context is added — dates, links, locations, related items." },
          { name: "Rank It", description: "The item is ordered or scheduled against everything else." },
          { name: "Take Action", description: "The person does something with it — sets a reminder, finishes the task, or hands it off." },
        ],
      },
      {
        id: "collect-review-publish",
        name: "Collect → Review → Publish",
        description: "Gathering content from lots of places, tidying it up, and sharing the result.",
        category: "task-workflow",
        stages: [
          { name: "Gather It", description: "Content is gathered from several sources or people." },
          { name: "Pull It Together", description: "The gathered pieces are merged into one tidy view, with duplicates removed." },
          { name: "Review & Polish", description: "The collection is checked for quality, accuracy, and completeness." },
          { name: "Sign Off", description: "A final yes before it goes out — a stakeholder review or your own confirmation." },
          { name: "Publish & Share", description: "The finished content is published, shared, or distributed." },
        ],
      },
      {
        id: "trigger-triage-resolve",
        name: "Trigger → Triage → Resolve",
        description: "A reactive workflow where something comes up, gets sorted, and gets handled.",
        category: "task-workflow",
        stages: [
          { name: "Something Comes Up", description: "An event grabs attention — a notification, an alert, or a request." },
          { name: "Size It Up", description: "A quick read — how urgent is this, and what's the impact?" },
          { name: "Sort by Priority", description: "It's routed to the right response — handle now, hand off, defer, or drop." },
          { name: "Handle It", description: "The right action is taken to deal with it." },
          { name: "Wrap Up & Learn", description: "It's marked done, and any lessons or patterns get noted." },
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
          { name: "Working Out What They Need", description: "The user identifies what they need the product to do for them." },
          { name: "Initial Setup", description: "Setting core preferences — accounts, defaults, permissions." },
          { name: "Making It Theirs", description: "Tailoring the experience — themes, layouts, notification preferences." },
          { name: "Testing It Works", description: "Verifying the setup works as expected with real use cases." },
          { name: "Go Live", description: "Committing to the configuration and starting regular use." },
        ],
      },
      {
        id: "core-task",
        name: "Core Task Journey",
        description: "The main thing the product was built for — the main job to be done.",
        category: "product-usage",
        stages: [
          { name: "Intent", description: "The user comes to the product with a specific goal in mind." },
          { name: "Finding the Way In", description: "They find the right feature or starting point for their task." },
          { name: "Doing the Task", description: "They perform the core action — creating, editing, sending, completing." },
          { name: "Confirmation", description: "They verify the task was completed correctly." },
          { name: "Exit", description: "They leave the product or move on to a different task." },
        ],
      },
      {
        id: "exception-handling",
        name: "Exception Handling Journey",
        description: "When things go wrong during product use and need a manual fix.",
        category: "product-usage",
        stages: [
          { name: "Something Goes Wrong", description: "Something unexpected happens — an error, conflict, or failure." },
          { name: "Working Out Why", description: "The user tries to understand what went wrong and why." },
          { name: "Looking for a Workaround", description: "They look for a way to fix it — undo, retry, alternative path." },
          { name: "Fixing It", description: "They fix the issue manually or with help." },
          { name: "Back on Track", description: "They return to their task and verify everything is back to normal." },
        ],
      },
      {
        id: "optimization",
        name: "Optimization Journey",
        description: "When a user refines their workflow to be faster and smoother over time.",
        category: "product-usage",
        stages: [
          { name: "Noticing the Friction", description: "The user notices inefficiency — too many clicks, repetitive steps, slow going." },
          { name: "Look for a Better Way", description: "They look for shortcuts — help docs, power-user tips, settings they missed." },
          { name: "Experiment", description: "They try shortcuts, automations, or workflow changes." },
          { name: "Make It Stick", description: "The improvement sticks — they work it into their regular routine." },
          { name: "Share It", description: "They may share the trick with teammates or the community." },
        ],
      },
      {
        id: "integration",
        name: "Integration Journey",
        description: "Connecting the product with the other tools the user relies on.",
        category: "product-usage",
        stages: [
          { name: "Need to Connect", description: "The user realizes they need the product to talk to another tool." },
          { name: "Finding the Integration", description: "They find available integrations — marketplace, settings, documentation." },
          { name: "Hooking It Up", description: "They set up the integration — authentication, permissions, mapping." },
          { name: "Checking It Works", description: "They test that data flows correctly between the tools." },
          { name: "Keeping It Running", description: "Monitoring the integration, handling sync errors, updating as tools change." },
        ],
      },
      {
        id: "collaboration",
        name: "Collaboration Journey",
        description: "When multiple people use the product together toward a shared goal.",
        category: "product-usage",
        stages: [
          { name: "Invite / Share", description: "One user brings others into the product or a shared workspace." },
          { name: "Getting Everyone Up to Speed", description: "New participants get oriented — permissions, context, expectations." },
          { name: "Working Together", description: "Multiple people contribute — editing, commenting, assigning, discussing." },
          { name: "Staying Coordinated", description: "Managing who does what — avoiding conflicts, staying aligned." },
          { name: "Outcome", description: "The shared goal is achieved and the collaboration wraps up or continues." },
        ],
      },
      {
        id: "review-reporting",
        name: "Review / Reporting Journey",
        description: "Looking back at what happened — dashboards, analytics, retrospectives.",
        category: "product-usage",
        stages: [
          { name: "Time to Look Back", description: "Something prompts a review — end of a period, a question, or a stakeholder ask." },
          { name: "Gather the Data", description: "Pulling together the relevant data — logs, metrics, history." },
          { name: "Make Sense of It", description: "Making sense of the data — trends, anomalies, insights." },
          { name: "Share the Findings", description: "Packaging findings into a shareable format — dashboard, report, presentation." },
          { name: "Act on It", description: "Using what was learned to make decisions or changes." },
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
