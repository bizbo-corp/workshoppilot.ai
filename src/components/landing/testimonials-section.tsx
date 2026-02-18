/**
 * Landing page testimonials section
 * 3 social proof quotes with author attribution
 * Server component — no client-side JS required
 *
 * Note: MVP placeholder testimonials — real quotes replace these post-launch
 */

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initial: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'I spent weeks trying to write a PRD for my side project. WorkshopPilot walked me through it in one session. The output was better than anything I could have written alone.',
    name: 'Sarah K.',
    role: 'Indie Developer',
    initial: 'S',
  },
  {
    quote:
      "As a non-technical founder, I always struggled to communicate my vision to developers. Now I hand them the Build Pack and they actually understand what I want.",
    name: 'Marcus L.',
    role: 'Startup Founder',
    initial: 'M',
  },
  {
    quote:
      'The design thinking process used to feel like something only consultants understood. This makes it accessible to anyone with an idea.',
    name: 'Priya M.',
    role: 'Product Designer',
    initial: 'P',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-12 sm:mb-16">
          What People Are Saying
        </h2>

        {/* Testimonial cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-xl border border-border bg-card p-6 sm:p-8"
            >
              {/* Quote */}
              <p className="text-sm text-foreground/80 leading-relaxed italic mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                {/* Initial circle */}
                <div className="w-10 h-10 rounded-full bg-olive-200 dark:bg-olive-800 flex items-center justify-center text-sm font-semibold text-olive-700 dark:text-olive-300 shrink-0">
                  {testimonial.initial}
                </div>

                {/* Name and role */}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
