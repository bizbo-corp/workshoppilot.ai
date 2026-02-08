---
status: complete
phase: 09-structured-outputs
source: 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-PLAN.md
started: 2026-02-08T12:00:00Z
updated: 2026-02-08T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Chat works on a workshop step
expected: Navigate to a workshop step (e.g., Step 1: Challenge). Type a message and send it. The AI should respond with a streaming reply. No errors in the console.
result: pass

### 2. Extract Output button appears after conversation
expected: After at least 4 messages (2 exchanges), an "Extract Output" button appears below the chat. It should NOT appear with fewer messages.
result: pass

### 3. Extraction loading state
expected: Click "Extract Output". A loading state appears in the output panel ("Extracting your output...") while the AI processes the conversation.
result: pass

### 4. Artifact renders as formatted Markdown
expected: After extraction completes, the output panel shows the extracted artifact as formatted Markdown — headings, bullet lists, bold labels. NOT raw JSON.
result: pass

### 5. Confirmation buttons appear after extraction
expected: Below the extracted artifact, two buttons appear: "Looks Good" (primary) and "Let me refine" (ghost/outline). Brief instructional text is shown above.
result: pass

### 6. Confirm artifact with Looks Good
expected: Click "Looks Good". A green checkmark with "Output confirmed" appears. A subtle "Re-extract" link is also shown.
result: pass

### 7. Navigation changes after confirmation
expected: Before confirmation, the Next button shows as "Skip to Next" (outline style). After clicking "Looks Good", it changes to "Next" with primary/default style.
result: pass

### 8. Let me refine clears artifact
expected: Instead of "Looks Good", click "Let me refine". The artifact clears and you return to the chat + placeholder output view, able to continue chatting and re-extract later.
result: pass

### 9. Extraction error handling
expected: On a step with very little conversation (1 message or empty), try to trigger extraction or observe the error state. Should show "I had trouble extracting your output" with a "Try Again" button — no crash or unhandled error.
result: pass

### 10. Step advance works after confirmation
expected: After confirming artifact, click "Next" to advance to the next step. The navigation should work and the next step should load correctly.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
