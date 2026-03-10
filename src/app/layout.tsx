import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { BreakpointIndicator } from "@/components/dev/breakpoint-indicator";
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
    "AI-powered design thinking facilitator - transform vague ideas into validated Build Packs",
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

  const content = (
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
          {children}
          <Analytics />
          <SpeedInsights />
          <Toaster richColors position="bottom-right" />
          <BreakpointIndicator />
        </ThemeProvider>
      </body>
    </html>
  );

  if (hasClerkKeys) {
    return (
      <ClerkProvider
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        appearance={{
          layout: {
            socialButtonsVariant: "blockButton",
          },
          variables: {
            colorPrimary: "#6b7a2f",
            colorBackground: "hsl(var(--card))",
            colorText: "hsl(var(--foreground))",
            colorInputBackground: "hsl(var(--background))",
            colorInputText: "hsl(var(--foreground))",
            borderRadius: "0.5rem",
            fontFamily: "var(--font-geist-sans)",
          },
          elements: {
            card: "shadow-none",
            formButtonPrimary:
              "bg-primary hover:bg-primary/90 text-primary-foreground",
            footerActionLink: "text-primary hover:text-primary/80",
            identityPreviewEditButton: "text-primary",
            socialButtonsBlockButton:
              "border-border text-foreground hover:bg-accent",
            socialButtonsBlockButtonText: "font-medium",
            socialButtonsProviderIcon: "w-5 h-5",
            dividerLine: "bg-border",
            dividerText: "text-muted-foreground",
            formFieldInput:
              "border-border bg-background text-foreground focus:ring-ring",
            formFieldLabel: "text-foreground",
          },
        }}
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
