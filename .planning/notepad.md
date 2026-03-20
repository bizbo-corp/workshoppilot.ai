## Todo

- [ ] E2E Story Framework in multiplayer mode to iron out remaining snags
    - [ ] Dialog
    - [ ] Journey Map
    - [ ] Presentation
    - [ ] Grouping by facilitator only
- [ ] Journey Map -> Tech Specs -> PRDs

## Notes

- [ ] After selecting a Multiplayer workshop: I need a more in-your-face way of sharing the link so maybe the first step is a modal for the facilitator to share this via email or get a code that they can pass on to participants. 
    - [ ] I want the first step (Challenge) to be facilitator only (and single player self facilitated). After they should be able to share the link with particpants
    - [ ] Participants will first get an intro of what the challenge is (They will be told, rather than have to create)

Improve the UX of the chat window when it's in collapsed mode. 

## Challenge

## Stakeholder Mapping

## Research Sense Making

## Persona Development

 Give the facilitator the ability to choose the best or combine many into single personas 

## Journey Mapping

## Reframing Challenge

## Ideation

  What's fixed:

- Phase 1 container width is now dynamic — it

  computes the actual extent of visible mind map

  nodes and sizes to fit them (minimum 1600px) 

- In individual participant view, it filters to

   only that participant's nodes for sizing

  What may still need tweaking after testing:

- The container X position (defaultX =

  leftEdgeX - PHASE_CONTENT_PADDING) is always

  anchored at -824 in individual view. If nodes

  extend far to the right, the container widens

  rightward but is anchored at the left. You

  might want to also shift defaultX left based on

   minX of the visible nodes to center the

  container around the content.

- The container height is still fixed at 1496px

   — if nodes extend vertically beyond that,

  you'd need similar dynamic height logic.

  Please test the current fix and start a new

  conversation if further adjustments are needed.

## Concept Development

## Validate