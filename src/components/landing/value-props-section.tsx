import { Brain, Zap, Lightbulb, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Landing page value propositions section
 * 4 cards explaining why to use WorkshopPilot
 * Server component — no client-side JS required
 */

interface ValueProp {
  icon: LucideIcon;
  title: string;
  description: string;
}

const VALUE_PROPS: ValueProp[] = [
  {
    icon: Brain,
    title: 'AI Facilitator, Not a Chatbot',
    description:
      'A structured 10-step design thinking process guided by AI. It asks the right questions, challenges assumptions, and keeps you on track — just like a human facilitator would.',
  },
  {
    icon: Zap,
    title: 'Vague Idea to Validated Specs',
    description:
      'Start with nothing more than a rough concept. End with PRDs, user stories, and technical specifications that AI coding tools can immediately act on.',
  },
  {
    icon: Lightbulb,
    title: 'No Experience Required',
    description:
      "You don't need to know what design thinking is. The AI handles methodology — you bring domain knowledge and creative instinct.",
  },
  {
    icon: FileText,
    title: 'Build Pack Output',
    description:
      'Every workshop produces a complete Build Pack: structured deliverables designed for handoff to AI coders like Cursor, Copilot, or Claude.',
  },
];

export function ValuePropsSection() {
  return (
    <section className="py-20 sm:py-24 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-4">
          Why WorkshopPilot?
        </h2>
        <p className="text-muted-foreground text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
          Everything you need to go from rough idea to build-ready specs.
        </p>

        {/* Value prop cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {VALUE_PROPS.map((prop) => {
            const Icon = prop.icon;
            return (
              <div key={prop.title}>
                <Icon
                  size={32}
                  className="text-olive-600 dark:text-olive-400 mb-4"
                />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {prop.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {prop.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
