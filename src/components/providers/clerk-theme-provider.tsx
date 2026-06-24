'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

/**
 * Wraps ClerkProvider so Clerk's hosted UI (sign-in/up modals, user button)
 * follows the app theme. Light mode keeps the original appearance untouched;
 * dark mode layers Clerk's official `dark` baseTheme on top so text stays
 * legible on dark surfaces. Must live inside ThemeProvider to read the resolved
 * theme.
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        layout: {
          socialButtonsVariant: 'blockButton',
        },
        // Light-mode variables kept verbatim from the original config so light
        // mode renders identically. Dark mode is handled entirely by baseTheme.
        variables: {
          colorPrimary: '#6b7a2f',
          colorBackground: 'hsl(var(--card))',
          colorText: 'hsl(var(--foreground))',
          colorInputBackground: 'hsl(var(--background))',
          colorInputText: 'hsl(var(--foreground))',
          borderRadius: '0.5rem',
          fontFamily: 'var(--font-geist-sans)',
        },
        elements: {
          card: 'shadow-none',
          formButtonPrimary:
            'bg-primary hover:bg-primary/90 text-primary-foreground',
          footerActionLink: 'text-primary hover:text-primary/80',
          identityPreviewEditButton: 'text-primary',
          socialButtonsBlockButton:
            'border-border text-foreground hover:bg-accent',
          socialButtonsBlockButtonText: 'font-medium',
          socialButtonsProviderIcon: 'w-5 h-5',
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground',
          formFieldInput:
            'border-border bg-background text-foreground focus:ring-ring',
          formFieldLabel: 'text-foreground',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
