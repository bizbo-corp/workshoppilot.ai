import Logo from '@/components/Logo';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex flex-col items-center justify-center gap-8 px-4 text-center">
        <Logo size="lg" className="sm:text-7xl md:text-8xl" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground/80 sm:text-3xl">
          From Vague Idea to AI-Ready Specs.
        </h1>
        <p className="text-muted-foreground">
          Democratizing Product Management with Design Thinking.
        </p>
      </main>
    </div>
  );
}
