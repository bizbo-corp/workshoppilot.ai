"use client";

import { useUser } from "@clerk/nextjs";

const ADMIN_EMAIL = "michael@bizbo.co.nz";
const ENABLED =
  process.env.NEXT_PUBLIC_SHOW_BREAKPOINTS === "1" ||
  process.env.NEXT_PUBLIC_SHOW_BREAKPOINTS === "true";

export function BreakpointIndicator() {
  const { user } = useUser();

  if (!ENABLED) return null;

  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email || email.toLowerCase() !== ADMIN_EMAIL) return null;

  return (
    <div className="fixed bottom-2 right-2 z-[9999] flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-white shadow-lg backdrop-blur-sm">
      <span className="sm:hidden">XS</span>
      <span className="hidden sm:inline md:hidden">SM</span>
      <span className="hidden md:inline lg:hidden">MD</span>
      <span className="hidden lg:inline xl:hidden">LG</span>
      <span className="hidden xl:inline 2xl:hidden">XL</span>
      <span className="hidden 2xl:inline">2XL</span>
    </div>
  );
}
