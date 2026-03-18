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

## Concept Development

## Validate





  Error message: Expected property name or '}' in JSON at position 65466 (line 3 column 65447)

      at async POST (src/app/api/ai/enhance-sketch-ideas/route.ts:158:24)

    156 |

    157 |       try {

> 158 |         const result = await generateObject({
> |                        ^
> 159 |           model: google('gemini-2.0-flash'),
> 160 |           schema: z.object({
> 161 |             ownerSlots: z.record(z.string(), z.array(slotSchema)), {
> text: '{\n' +
> '  "ownerSlots": {\n' +
> '                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            '... 55466 more characters,
> [cause]: [SyntaxError: Expected property name or '}' in JSON at position 65466 (line 3 column 65447)]
> }
> }
> POST /api/ai/enhance-sketch-ideas 200 in 11.1s (compile: 1924µs, proxy.ts: 5ms, render: 11.1s)
> POST /api/ai/