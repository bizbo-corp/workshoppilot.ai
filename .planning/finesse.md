# Next features 

End to end workshop. gather feedback and refinements for each step

Task: How might we help business users craft a story so they can effectively articulate their ideas

## General features

Workshop cards have a colour and and emoji symbol for indentification

## Shared features

- Example

## Challenge

- The AI doesn't need to be too specific about the audience yet. It can be broadly asked who has the problem but the specifics should optional ask if they want to dive deeper. After all the stakeholders and future steps will uncover more specific stakeholders that will feed into Personas and HMW statements.
- No need to make assumptions at this stage. Perhaps lead with open questions like: What could business people get out of an improved idea or solution? e.g Time, Accolade, Peace of Mind"
- Don't give ooptions for Spcific, balanced or broad statements. Choose one in the background that is aspirational, opens up possibilities. e.g: "How might we transform business communication through storytelling so that business people can connect with their audience on a deeper level and achieve greater success?". This leaves opportunities to explore broad ideas and ends with an deeper emotional goal. 
- No need to ask about measuring the goal. 
- The last step mentions "Then, let's jump to the next step: Ideate. ✨Ready to generate some solutions?" this is not correct. the next step is "Stakeholder Mapping"

-> Output the challenge statement to the Whiteboard. Allow the user to directly edit it. 



## Stakeholder

- If the page gets reloaded the initial message shows twice [bug]
- Optimise the original message from:



  Alright, let's map out the stakeholders! 🗺️ This step is about identifying who has a vested interest in our storytelling solution – not just the end-users, but also decision-makers, influencers, and anyone affected by it. This helps us make sure we're solving the right problem for everyone involved.

  Based on your HMW statement, it sounds like business people are central to this. Who else comes to mind as someone who's impacted by this challenge or could influence our solution?

to: Alright, let's map out the stakeholders! 🗺️ The purpose of this stage is to identify the different people, groups, organisations and services who; benefit from, contribute to and potentially disrupt the current service or experience involved in the challenge. 

[Next chat bubble]

Who are the end-users, the decision-makers, influencers that impact. Don't be afraid to divide bigger groups e.g End Users into smaller groups e.g: New / Returning customers or even more specific e.g 20 somethings, WINKS/DINKS, Pet owners, Cat woners [Tailor this to the workshop challenge]

Here are some ideas to get you started:

[Business Dept Heads] -> adds a post it directly to the board

[Finance Dept] -> adds a post it directly to the board

[External Vendors] -> adds a post it directly to the board



Prompt the user to add the post its directly to the Whiteboard. 

e.g: What do you think would be another direct or inderect stakeholder?

If a user is stuck then offer a suggestion with a button to generate suggestion

Stuck? 

[give me an idea] [Ask me a prompting question to guide me]



Make the Chat post-it suggestions in the same yellow as a post-it



Don't ask about High, medium, or low power. Just do it silently in the background and ask the user if they wish to move it further in/out based on their power and interest



## Seed paths

http://localhost:3000/api/dev/seed-workshop?upToStep=challenge     

http://localhost:3000/api/dev/seed-workshop?upToStep=user-research

http://localhost:3000/api/dev/seed-workshop?upToStep=sense-making

http://localhost:3000/api/dev/seed-workshop?upToStep=persona

http://localhost:3000/api/dev/seed-workshop?upToStep=journey-mapping

http://localhost:3000/api/dev/seed-workshop?upToStep=reframe

http://localhost:3000/api/dev/seed-workshop?upToStep=ideation

http://localhost:3000/api/dev/seed-workshop?upToStep=concept

http://localhost:3000/api/dev/seed-workshop?upToStep=validate

### CLI command

npm run db:seed:workshop -- --clerk-user-id YOUR_CLERK_USER_ID --up-to-step validate



  ┌──────┬─────────────────────┐                                                                                       

  │ Step │         ID          │

  ├──────┼─────────────────────┤

  │ 1    │ challenge           │                                                                                           

  ├──────┼─────────────────────┤

  │ 2    │ stakeholder-mapping │                                                                                           

  ├──────┼─────────────────────┤            

  │ 3    │ user-research       │               

  ├──────┼─────────────────────┤

  │ 4    │ sense-making        │

  ├──────┼─────────────────────┤

  │ 5    │ persona             │

  ├──────┼─────────────────────┤

  │ 6    │ journey-mapping     │

  ├──────┼─────────────────────┤

  │ 7    │ reframe             │

  ├──────┼─────────────────────┤

  │ 8    │ ideation            │

  ├──────┼─────────────────────┤

  │ 9    │ concept             │

  ├──────┼─────────────────────┤

  │ 10   │ validate (default)  │

  └──────┴─────────────────────┘