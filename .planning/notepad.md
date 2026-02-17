---

- 

## Card Context

Ensure the AI can understand the context before proceeding. 

- Work on whiteboard first (Stakeholders)
    - Chat prompts user to add post-it first
- User Research
    - Ask the user which stakeholders they would like to interview. We're convened one to three. Ask them to confirm Via checkbox 

 show the overall workshop challenge on all pages 

Allow the user to put their suggestions on before offering some canned ideas. When offering canned ideas, make sure it bypasses the chat and just gets directly added to the board. 

After giving the user some time to add their post-its, show a button saying.

Give some proactive feedback

The greeting is very verbose. Can you make it more consice and add the context cleverly. Use emojis







---



Now the hull is at z-30 (above nodes at z-20). But there's a problem: the hull rect

   covers the entire bounding box including where nodes are, so clicking a node  

  inside the hull would hit the hull SVG rect first. I need to make the SVG layer

  pass through clicks to nodes except on the hull rects themselves.

  The issue is that the SVG is a separate DOM element from ReactFlow's node layer.

  With z-30, the SVG sits above ReactFlow's entire node container. Clicks on the SVG 

  will never reach nodes below it — even with pointer-events: none on the SVG      

  element, the hull rects with pointer-events: auto cover the node areas too.

  The solution: render the hull as a frame (border only) instead of a filled rect

  that covers everything. I'll use an SVG <path> or just use pointer-events: stroke

  so only the border area is clickable, not the interior. But stroke pointer-events

  means only the border line — too narrow.

  Better approach: render the hull as an HTML div overlay outside ReactFlow

  (alongside the selection toolbar), with a higher z-index. The div acts as a grab

  handle on the border/padding area only. The interior is transparent to clicks via a

   CSS technique.

  Actually, the simplest approach: keep the SVG at z-30 but only enable pointer

  events on the hull border padding area, not the center. I can do this with a

  clip-path or by using pointer-events: visiblePainted with a transparent fill and

  only filling the padding region via a path.

  Let me use a cleaner approach: render the hull overlay as positioned HTML divs

  outside of <ReactFlow> (in the same container), use border for the visual, and make

   the interior pointer-events: none while the border area is pointer-events: auto.

  This way nodes inside the hull remain fully clickable.