import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClerkThemeProvider } from "@/components/providers/clerk-theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "WorkshopPilot",
  description:
    "AI-facilitated design thinking workshops — find out if your idea is worth building, and walk out with the test already built",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerkKeys =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

  // Clerk's appearance must react to the resolved theme, so ClerkProvider lives
  // inside ThemeProvider (via ClerkThemeProvider). When Clerk keys are absent we
  // skip the provider entirely and render children directly.
  const inner = hasClerkKeys ? (
    <ClerkThemeProvider>{children}</ClerkThemeProvider>
  ) : (
    children
  );

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        {/* Polyfill crypto.randomUUID for browsers without secure context */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof crypto!=="undefined"&&!crypto.randomUUID){crypto.randomUUID=function(){return"10000000-1000-4000-8000-100000000000".replace(/[018]/g,function(c){return(+c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>+c/4).toString(16)})}}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
        >
          {inner}
          <Analytics />
          <SpeedInsights />
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
