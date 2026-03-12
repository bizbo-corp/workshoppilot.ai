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

Bizzy and Sally particpants cannot be truely deleted Fix: 

4 fix attempts haven't solved it. The most likely remaining cause is H4:

  ParticipantRemovedListener may be outside the CanvasStoreProvider tree, so its

  useCanvasStore call either targets the wrong store or silently fails.

  Start the next conversation with:

  "Continue debugging deleted participants reappearing. Read

  /Users/michaelchristie/.claude/projects/-Users-michaelchristie-devProjects-workshopp

  ilot-ai/memory/debug-deleted-participants.md for full context. Investigate

  hypothesis H4 first — check if ParticipantRemovedListener is inside

  CanvasStoreProvider's React tree."

  The key investigation steps for the next session:

1. Trace the component tree to verify ParticipantRemovedListener can access

  CanvasStoreProvider

2. If it can't, move the deletion logic to a component that CAN access both the

  Liveblocks broadcast AND the canvas store

3. Consider the nuclear option from the debug notes: store deletedOwnerIds[] in

  Liveblocks storageMapping itself, so ALL clients see it via CRDT sync and filter

  deleted owners at render time





## Concept Development

## Validate