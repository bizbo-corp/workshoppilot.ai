import Logo from '@/components/Logo';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex flex-col items-center justify-center gap-8 px-4">
        <Logo size="lg" className="sm:text-7xl md:text-8xl" />
      </main>
    </div>
  );
}
