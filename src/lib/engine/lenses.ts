import { z } from 'zod';
import type { IdeaType } from './types';

/**
 * Idea-type lenses. One engine, one set of stages; the lens changes the
 * words the AI uses, which boards matter, what counts as evidence, which
 * cheap tests are offered and what the paid report adds.
 *
 * Lenses are data validated by a schema, never branches in engine code.
 */
export const lensSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Who the solution is for, in the lens's own words. */
  personNoun: z.string(),
  /** What the solution is called. */
  thingNoun: z.string(),
  /** Which journey framing the strip uses. */
  journeyFraming: z.enum(['journey', 'service_journey', 'before_after', 'moments_of_use']),
  journeyMomentLabels: z.array(z.string()).length(5),
  /** One paragraph the AI reads in every stage. */
  promptNotes: z.string(),
  /** The evidence bar: what counts as real demand for this type. */
  evidenceBar: z.array(z.string()).min(2),
  /** Cheap tests to offer in Deliver. */
  cheapTests: z.array(z.string()).min(2),
  /** Sections the paid Build Pack adds for this type. */
  reportAdds: z.array(z.string()),
});
export type Lens = z.infer<typeof lensSchema>;

const digital: Lens = {
  id: 'digital_product',
  label: 'Digital product',
  personNoun: 'user',
  thingNoun: 'product',
  journeyFraming: 'journey',
  journeyMomentLabels: ['Trigger', 'Looking', 'First try', 'Using', 'Outcome'],
  promptNotes:
    'This is a digital product: an app, web tool or software service. Talk about users, screens and sign-ups. Watch for the classic trap of a feature list posing as a problem.',
  evidenceBar: ['Sign-ups or waitlist joins from strangers', 'Clicks on a fake door or landing page', 'Interviewees who describe the problem unprompted'],
  cheapTests: ['Landing page with a sign-up form', 'Fake door inside an existing tool', 'Clickable mock in front of five target users'],
  reportAdds: ['PRD', 'Tech specs', 'Prototype prompt'],
};

const service: Lens = {
  id: 'service',
  label: 'Service',
  personNoun: 'customer',
  thingNoun: 'service',
  journeyFraming: 'service_journey',
  journeyMomentLabels: ['Aware', 'Enquire', 'Book', 'Receive', 'After'],
  promptNotes:
    'This is a service delivered by people: think touchpoints, staff, front stage and back stage. Talk about customers and the people delivering it. Capacity and consistency are usual risks.',
  evidenceBar: ['Bookings or enquiries', 'Repeat use or referrals', 'Willingness to pay stated with a number'],
  cheapTests: ['Concierge trial with three customers by hand', 'A booking page with a real calendar', 'Pre-sell one slot at the intended price'],
  reportAdds: ['Service blueprint', 'Staffing and capacity sketch'],
};

const process: Lens = {
  id: 'process_change',
  label: 'Process change',
  personNoun: 'team member',
  thingNoun: 'process',
  journeyFraming: 'before_after',
  journeyMomentLabels: ['Trigger', 'Hand-off', 'The work', 'Check', 'Done'],
  promptNotes:
    'This is a change to how a team or organisation works. Talk about teams, steps and hand-offs. The journey strip is the process as it runs today; the dip is where time or quality is lost. Adoption by the people doing the work is the usual risk.',
  evidenceBar: ['Measured time saved or errors cut in a pilot', 'The team doing the work asked for it', 'A manager committed to run a pilot'],
  cheapTests: ['Pilot with one team for two weeks', 'Shadow run: do the new process on paper beside the old one', 'Time three real cases before and after'],
  reportAdds: ['Before and after process map', 'Rollout checklist'],
};

const physical: Lens = {
  id: 'physical_product',
  label: 'Physical product',
  personNoun: 'buyer',
  thingNoun: 'product',
  journeyFraming: 'moments_of_use',
  journeyMomentLabels: ['Need', 'Buying', 'First use', 'Everyday use', 'Wear and end'],
  promptNotes:
    'This is a physical product people hold or use. Talk about buyers, moments of use and cost per unit. The journey strip is the moments of use. Manufacturing cost and margin are risks you must raise.',
  evidenceBar: ['Pre-orders or deposits', 'Hands-on prototype test with target buyers', 'A rough cost per unit that leaves margin at the intended price'],
  cheapTests: ['Pre-order page with a deposit', 'Paper or 3D-printed prototype in front of five buyers', 'Quote from one supplier for 100 units'],
  reportAdds: ['Product brief', 'Rough cost model'],
};

/** The eight idea types map to the four lenses above. */
const LENS_BY_TYPE: Record<IdeaType, Lens> = {
  digital_product: digital,
  service,
  process_change: process,
  physical_product: physical,
  offering: { ...service, id: 'offering', label: 'Offering', thingNoun: 'offer', promptNotes: 'This is a new offer, package or pricing. Treat it like a service: what the customer buys, why, and at what price.' },
  experience: { ...service, id: 'experience', label: 'Experience', thingNoun: 'experience', promptNotes: 'This is an experience or event. Treat it like a service: moments, people delivering it, and what people remember.' },
  brand: { ...digital, id: 'brand', label: 'Brand and communication', thingNoun: 'message', journeyFraming: 'journey', journeyMomentLabels: ['Notice', 'Understand', 'Believe', 'Act', 'Tell others'], promptNotes: 'This is about how something is named, framed and communicated. Talk about audiences and perception, not features.', evidenceBar: ['Message test with the target audience', 'Replies or enquiries from a real send', 'Recall of the message a week later'], cheapTests: ['Two-message test to the same list', 'Five-second test of the headline', 'One landing page per message'], reportAdds: ['Messaging brief'] },
  campaign: { ...digital, id: 'campaign', label: 'Campaign', thingNoun: 'campaign', journeyMomentLabels: ['See', 'Care', 'Click', 'Act', 'Share'], promptNotes: 'This is a time-bound campaign. Talk about audience, channel and the one action you want.', evidenceBar: ['Click-through from a small paid test', 'Sign-ups or actions per 100 reached', 'Shares from strangers'], cheapTests: ['Small paid test on one channel', 'Email to 50 people with one call to action', 'Two creatives, same audience'], reportAdds: ['Campaign brief'] },
};

for (const lens of Object.values(LENS_BY_TYPE)) lensSchema.parse(lens);

export function getLens(ideaType: IdeaType | null): Lens | null {
  return ideaType ? LENS_BY_TYPE[ideaType] : null;
}

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = Object.fromEntries(
  Object.entries(LENS_BY_TYPE).map(([k, v]) => [k, v.label]),
) as Record<IdeaType, string>;
