#!/bin/bash

# Auto-generated script to create GitHub issues for MVP 0.5
# Run this from your dev repo: /Users/michaelchristie/devProjects/workshoppilot.ai/

echo "🚀 Creating GitHub issues for MVP 0.5..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found"
    echo "📦 Install with: brew install gh"
    echo "🔑 Then authenticate: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "🔑 Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI ready"
echo ""

# Function to create label if it doesn't exist
create_label_if_missing() {
    local label_name="$1"
    local label_color="$2"
    local label_description="$3"
    
    # Check if label exists
    if ! gh label list --json name --jq '.[].name' | grep -q "^${label_name}$"; then
        echo "📌 Creating label: ${label_name}..."
        gh label create "${label_name}" --color "${label_color}" --description "${label_description}" 2>/dev/null || true
    fi
}

# Ensure required labels exist
echo "🏷️  Checking labels..."
create_label_if_missing "MVP-0.5" "0E8A16" "MVP version 0.5 features"
create_label_if_missing "P0" "D93F0B" "Highest priority"
create_label_if_missing "feature" "A2EEEF" "New feature or request"
echo "✅ Labels ready"
echo ""

# Issue 002: Workshop Flow UI
echo "Creating: 002 - Workshop Flow UI..."
gh issue create \
  --title "002: Workshop Flow UI" \
  --body "## Spec Reference
Obsidian: \`02_Specs/002-Workshop-Flow-UI.md\`

## Description
Linear step progression with navigation controls and progress tracking

## User Stories
- As a participant, I want to progress through workshop steps linearly so that I complete the workshop in the correct order
- As a participant, I want to see my progress so that I know how much of the workshop remains
- As a participant, I want to go back to previous steps so that I can review or edit my responses

## Requirements
- [ ] Single \"Next\" button to move forward through steps
- [ ] \"Back\" button to return to previous step
- [ ] Cannot skip steps - must complete sequentially
- [ ] Visual progress bar showing current position
- [ ] Step numbers/titles visible in navigation
- [ ] Current step highlighted
- [ ] Completed steps marked (checkmark or color change)
- [ ] Upcoming steps visible but disabled

## Acceptance Criteria
- [ ] Participants can navigate forward and backward through steps
- [ ] Progress bar updates correctly
- [ ] Step validation prevents skipping
- [ ] UI is responsive and intuitive

## Estimate
3d

## Dependencies
- Depends on #1 (Auth Setup)

---
**Labels**: MVP-0.5, P0, feature" \
  --label "MVP-0.5,P0,feature"

echo "✅ Created issue #2"
echo ""

# Issue 003: AI Chat Integration
echo "Creating: 003 - AI Chat Integration..."
gh issue create \
  --title "003: AI Chat Integration" \
  --body "## Spec Reference
Obsidian: \`02_Specs/003-AI-Chat-Integration.md\`

## Description
Gemini API integration with context-aware chat interface

## User Stories
- As a participant, I want to chat with AI at each step so that I can get guidance and feedback
- As a participant, I want the AI to understand my previous responses so that I get contextual help
- As a facilitator, I want AI prompts tailored to each workshop phase so that participants get relevant guidance

## Requirements
- [ ] Gemini API integration per step
- [ ] AI knows which step the user is on
- [ ] AI has access to previous step responses
- [ ] Prompts tailored to current workshop phase
- [ ] Message input field
- [ ] Send button
- [ ] Message history display
- [ ] Simple styling (user messages right, AI messages left)

## Acceptance Criteria
- [ ] Chat interface works at each step
- [ ] AI responses are contextually relevant
- [ ] Previous responses inform AI behavior
- [ ] Messages persist in database

## Estimate
3d

## Dependencies
- Depends on #2 (Workshop Flow UI)

---
**Labels**: MVP-0.5, P0, feature" \
  --label "MVP-0.5,P0,feature"

echo "✅ Created issue #3"
echo ""

# Issue 004: State Management
echo "Creating: 004 - State Management..."
gh issue create \
  --title "004: State Management & Persistence" \
  --body "## Spec Reference
Obsidian: \`02_Specs/004-State-Management.md\`

## Description
Save workshop state between steps and sessions

## User Stories
- As a participant, I want my responses saved automatically so that I don't lose my work
- As a participant, I want to resume my workshop after closing the browser so that I can complete it at my own pace
- As a facilitator, I want participant data persisted so that I can review their progress

## Requirements
- [ ] Save responses when clicking \"Next\"
- [ ] Store in Vercel Postgres database
- [ ] Load responses when returning to previous steps
- [ ] User can close browser and resume later
- [ ] State tied to user ID + workshop session ID
- [ ] Auto-save on every significant action
- [ ] Database schema implementation

## Acceptance Criteria
- [ ] Responses persist across sessions
- [ ] Users can resume from where they left off
- [ ] No data loss on navigation
- [ ] Database schema properly implemented

## Estimate
2d

## Dependencies
- Depends on #2 (Workshop Flow UI)

---
**Labels**: MVP-0.5, P0, feature" \
  --label "MVP-0.5,P0,feature"

echo "✅ Created issue #4"
echo ""

# Issue 005: Admin Dashboard
echo "Creating: 005 - Admin Dashboard..."
gh issue create \
  --title "005: Admin Dashboard" \
  --body "## Spec Reference
Obsidian: \`02_Specs/005-Admin-Dashboard.md\`

## Description
Facilitator view to monitor participant progress

## User Stories
- As a facilitator, I want to see which step my participants are on so that I can monitor their progress
- As a facilitator, I want to view participant responses so that I can understand their thinking
- As a facilitator, I want a simple dashboard so that I can quickly check on my workshop

## Requirements
- [ ] Dashboard showing active participant(s)
- [ ] Display current step each participant is on
- [ ] Ability to view participant responses (read-only)
- [ ] Simple dashboard layout
- [ ] Protected route (facilitator only)

## Acceptance Criteria
- [ ] Facilitators can access dashboard
- [ ] Participants cannot access dashboard
- [ ] Real-time participant data displayed
- [ ] Responses are read-only

## Estimate
2d

## Dependencies
- Depends on #1 (Auth Setup)
- Depends on #4 (State Management)

---
**Labels**: MVP-0.5, P0, feature" \
  --label "MVP-0.5,P0,feature"

echo "✅ Created issue #5"
echo ""

# Issue 006: Workshop Steps Content
echo "Creating: 006 - Workshop Steps Content..."
gh issue create \
  --title "006: Workshop Steps Content" \
  --body "## Spec Reference
Obsidian: \`02_Specs/006-Workshop-Steps-Content.md\`

## Description
Implement the 11 Design Thinking workshop steps

## User Stories
- As a participant, I want clear instructions at each step so that I know what to do
- As a participant, I want to input my responses at each step so that I can document my thinking
- As a facilitator, I want a structured workshop flow so that participants follow the design thinking process

## Requirements
- [ ] Challenge - Define the problem
- [ ] Stakeholder Mapping - Identify key stakeholders
- [ ] User Research - Gather user insights
- [ ] Research Sense Making - Analyze findings
- [ ] Persona Development - Create user personas
- [ ] Journey Mapping - Map user experience
- [ ] Reframing Challenge - Redefine problem with insights
- [ ] Ideation - Generate solution ideas
- [ ] Concept Development - Develop selected concepts
- [ ] Validate - Test and validate solutions
- [ ] Each step has title, instructions, text input, and AI chat

## Acceptance Criteria
- [ ] All 11 steps have complete content
- [ ] Instructions are clear and actionable
- [ ] AI prompts are step-appropriate
- [ ] Text input works for all steps

## Estimate
2d

## Dependencies
- Depends on #2 (Workshop Flow UI)
- Depends on #3 (AI Chat Integration)

---
**Labels**: MVP-0.5, P0, feature" \
  --label "MVP-0.5,P0,feature"

echo "✅ Created issue #6"
echo ""

echo "✅ All GitHub issues created!"
echo ""
echo "🔗 View them at:"
gh repo view --web --branch main
echo ""
echo "📝 Next steps:"
echo "   1. Review issues on GitHub"
echo "   2. Update issue numbers in Obsidian specs"
echo "   3. Start working on first issue!"
