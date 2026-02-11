Next features 

## General Post-it UX

Draging the post-it-notes do not show drag feedback i.e a trail or fain post it as you drag it

Cursor while hovering is a hand. SHould be a pointer



## AI Chat Window White board canvas cross interactions

AI Chat & Canvas Cross-Interaction

1. Actionable Response UI

Direct Action Buttons: Every AI suggestion (e.g., a proposed list of post-it ideas for the whiteboard) must be accompanied by two distinct action buttons:

[Add to Whiteboard]: Instantly renders the AI's output as new Post-it notes or objects on the canvas.

Visual Preview: (Optional but recommended) Hovering over "Add to Whiteboard" should show a ghosted preview of where the new items will be placed.

2. Execution Logic (One-Click Workflow)

Instant Command Execution: Clicking any button within the AI Chat window must trigger the corresponding function immediately.

Eliminate Redundant Input: Remove the current behavior where clicking a button merely pastes text into the chat input field. The AI should treat the button click as a "Finalized Command" rather than a "Draft."

Auto-Context Injection: When an action is triggered, the system should automatically pass the current Whiteboard canvas state (or selected items) to the backend to ensure the placement of new elements doesn't overlap existing work.

3. Selection Awareness

Targeting: If items are selected on the canvas, the AI "Change" button should prioritize those specific items.

Focus Shift: After clicking "Add to Canvas," the viewport should subtly animate or zoom to the newly created elements to provide immediate feedback to the user.

## Panels

Panels have a border

Dragable panels have a grip on hover

Whiteboard canvas has a fait grey BG with grey dots

## AI Chat Winodw

Ensure the default position of the chat is scolled to the bottom . Currently it is set to be halfway. Ensure the text is always bottom unless user purposely scrolls up. 

## Bug

Whenever the Journey Mapping page loads the cards get auto added leading to duplicates





