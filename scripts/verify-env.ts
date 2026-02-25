#!/usr/bin/env tsx

/**
 * Environment variable verification for production builds
 * Checks all required environment variables exist and validates Clerk key types
 */

const requiredVars = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICE_SINGLE_FLIGHT',
  'STRIPE_PRICE_SERIAL_ENTREPRENEUR',
];

const isProduction = process.env.VERCEL_ENV === 'production';

console.log('🔍 Verifying environment variables...');
console.log(`Environment: ${isProduction ? 'production' : 'non-production'}`);

let hasErrors = false;

// Check all required vars exist
for (const varName of requiredVars) {
  const value = process.env[varName];

  if (!value) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName} is set`);
  }
}

// In production, verify Clerk keys are NOT test keys
if (isProduction) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (publishableKey?.startsWith('pk_test_')) {
    console.error('❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is a test key (pk_test_*) but VERCEL_ENV is production');
    console.error('   Please use production Clerk keys for production deployments');
    hasErrors = true;
  }

  if (secretKey?.startsWith('sk_test_')) {
    console.error('❌ CLERK_SECRET_KEY is a test key (sk_test_*) but VERCEL_ENV is production');
    console.error('   Please use production Clerk keys for production deployments');
    hasErrors = true;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (stripeSecretKey?.startsWith('sk_test_')) {
    console.error('❌ STRIPE_SECRET_KEY is a test key (sk_test_*) but VERCEL_ENV is production');
    console.error('   Please use production Stripe keys for production deployments');
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n❌ Environment variable verification failed');
  process.exit(1);
}

console.log('\n✅ All environment variable checks passed');
