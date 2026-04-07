import {
  Monitor,
  Cloud,
  Link2,
  Shield,
  Database,
  Lock,
  Zap,
  Globe,
  CreditCard,
  Languages,
  Wrench,
} from 'lucide-react';
import type { WizardPageConfig } from './types';

export const WIZARD_PAGES: WizardPageConfig[] = [
  // ── Page 1: Platform ──────────────────────────────────────────
  {
    id: 'platform',
    title: 'Platform',
    description: 'What type of application are you building?',
    icon: Monitor,
    questions: [
      {
        type: 'single-select',
        key: 'platform',
        label: 'Primary platform',
        options: [
          { value: 'responsive-web', label: 'Responsive Web App', description: 'Works across all screen sizes in a browser' },
          { value: 'native-mobile', label: 'Native Mobile App', description: 'Built specifically for iOS and/or Android' },
          { value: 'desktop', label: 'Desktop Application', description: 'Installed app for Windows, Mac, or Linux' },
          { value: 'pwa', label: 'Progressive Web App', description: 'Web app with offline support and native-like features' },
          { value: 'combination', label: 'Combination', description: 'Multiple platforms (e.g. web + mobile)' },
        ],
      },
      {
        type: 'conditional',
        parentKey: 'platform',
        showWhen: ['native-mobile', 'combination'],
        question: {
          type: 'single-select',
          key: 'mobileTarget',
          label: 'Mobile target',
          options: [
            { value: 'ios', label: 'iOS only' },
            { value: 'android', label: 'Android only' },
            { value: 'both', label: 'Both iOS & Android' },
          ],
        },
      },
      {
        type: 'conditional',
        parentKey: 'platform',
        showWhen: ['responsive-web', 'pwa', 'combination'],
        question: {
          type: 'single-select',
          key: 'webArchitecture',
          label: 'Web architecture',
          options: [
            { value: 'spa', label: 'Single Page App (SPA)', description: 'Fast, app-like experience in the browser' },
            { value: 'ssr', label: 'Server-Side Rendered (SSR)', description: 'Better SEO and initial load performance' },
            { value: 'static', label: 'Static Site', description: 'Pre-built pages, ideal for content-focused sites' },
          ],
        },
      },
    ],
  },

  // ── Page 2: Hosting & Deployment ──────────────────────────────
  {
    id: 'hosting',
    title: 'Hosting & Deployment',
    description: 'Where will your application be hosted?',
    icon: Cloud,
    questions: [
      {
        type: 'single-select',
        key: 'hostingProvider',
        label: 'Cloud provider',
        options: [
          { value: 'aws', label: 'Amazon Web Services (AWS)' },
          { value: 'gcp', label: 'Google Cloud Platform' },
          { value: 'azure', label: 'Microsoft Azure' },
          { value: 'vercel', label: 'Vercel', description: 'Optimized for Next.js and frontend frameworks' },
          { value: 'netlify', label: 'Netlify', description: 'Great for static sites and Jamstack' },
          { value: 'self-hosted', label: 'Self-hosted / On-premises' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        type: 'single-select',
        key: 'deploymentArch',
        label: 'Deployment architecture',
        options: [
          { value: 'serverless', label: 'Serverless', description: 'Functions that scale automatically, pay per use' },
          { value: 'containers', label: 'Containers (Docker / K8s)', description: 'Portable, scalable container orchestration' },
          { value: 'traditional-vm', label: 'Traditional VM', description: 'Full virtual machines you manage directly' },
        ],
      },
    ],
  },

  // ── Page 3: Existing Systems ──────────────────────────────────
  {
    id: 'integrations',
    title: 'Existing Systems',
    description: 'Does this need to work with anything already in place?',
    icon: Link2,
    questions: [
      {
        type: 'single-select',
        key: 'projectType',
        label: 'Project type',
        options: [
          { value: 'greenfield', label: 'Greenfield (brand new)', description: 'Starting from scratch with no legacy constraints' },
          { value: 'extending-existing', label: 'Extending an existing system', description: 'Building on top of or integrating with current infrastructure' },
        ],
      },
      {
        type: 'text-input',
        key: 'existingApis',
        label: 'Existing APIs or services to integrate with',
        placeholder: 'e.g. Salesforce CRM, internal REST API, legacy database...',
      },
      {
        type: 'single-select',
        key: 'identityProvider',
        label: 'Identity provider',
        description: 'Do you already have a login system?',
        options: [
          { value: 'none', label: 'None yet' },
          { value: 'okta', label: 'Okta' },
          { value: 'auth0', label: 'Auth0' },
          { value: 'azure-ad', label: 'Azure Active Directory' },
          { value: 'firebase-auth', label: 'Firebase Auth' },
          { value: 'other', label: 'Other' },
        ],
      },
    ],
  },

  // ── Page 4: Authentication & Users ────────────────────────────
  {
    id: 'auth',
    title: 'Authentication & Users',
    description: 'How will people sign in and what does your user base look like?',
    icon: Shield,
    questions: [
      {
        type: 'multi-select',
        key: 'authMethods',
        label: 'Authentication methods',
        description: 'Select all that apply',
        options: [
          { value: 'email-password', label: 'Email & Password' },
          { value: 'social-login', label: 'Social Login', description: 'Google, GitHub, Apple, etc.' },
          { value: 'sso-saml', label: 'SSO / SAML', description: 'Enterprise single sign-on' },
          { value: 'magic-link', label: 'Magic Link', description: 'Passwordless email login' },
          { value: 'mfa', label: 'Multi-Factor Authentication' },
        ],
      },
      {
        type: 'single-select',
        key: 'userRoleComplexity',
        label: 'User roles',
        options: [
          { value: 'single-role', label: 'Single role', description: 'All users have the same access' },
          { value: '2-3-roles', label: '2-3 roles', description: 'e.g. Admin, Editor, Viewer' },
          { value: 'complex-hierarchy', label: 'Complex role hierarchy', description: 'Granular permissions, teams, or org structures' },
        ],
      },
      {
        type: 'single-select',
        key: 'userScale',
        label: 'Expected number of users',
        options: [
          { value: 'under-100', label: 'Under 100' },
          { value: '100-10k', label: '100 – 10,000' },
          { value: '10k-100k', label: '10,000 – 100,000' },
          { value: '100k-plus', label: '100,000+' },
        ],
      },
    ],
  },

  // ── Page 5: Data & Storage ────────────────────────────────────
  {
    id: 'data',
    title: 'Data & Storage',
    description: 'What kind of data will your application handle?',
    icon: Database,
    questions: [
      {
        type: 'multi-select',
        key: 'dataTypes',
        label: 'Primary data types',
        description: 'Select all that apply',
        options: [
          { value: 'structured', label: 'Structured / Relational', description: 'Tables, rows, and relationships' },
          { value: 'documents', label: 'Documents / JSON', description: 'Flexible, nested data structures' },
          { value: 'media', label: 'Media / Files', description: 'Images, videos, PDFs, etc.' },
          { value: 'time-series', label: 'Time-series', description: 'Sensor data, logs, analytics events' },
        ],
      },
      {
        type: 'single-select',
        key: 'databaseType',
        label: 'Database preference',
        options: [
          { value: 'relational', label: 'Relational (PostgreSQL / MySQL)', description: 'Strong consistency, complex queries' },
          { value: 'nosql', label: 'NoSQL (MongoDB / DynamoDB)', description: 'Flexible schemas, horizontal scaling' },
          { value: 'graph', label: 'Graph (Neo4j)', description: 'Relationship-heavy data' },
        ],
      },
      {
        type: 'single-select',
        key: 'fileStorage',
        label: 'File storage needs',
        options: [
          { value: 'none', label: 'None' },
          { value: 'images-only', label: 'Images only' },
          { value: 'documents', label: 'Documents', description: 'PDFs, spreadsheets, text files' },
          { value: 'rich-media', label: 'Rich media', description: 'Video, audio, large files' },
        ],
      },
    ],
  },

  // ── Page 6: Security & Compliance ─────────────────────────────
  {
    id: 'security',
    title: 'Security & Compliance',
    description: 'What security and regulatory requirements apply?',
    icon: Lock,
    questions: [
      {
        type: 'single-select',
        key: 'dataSensitivity',
        label: 'Data sensitivity level',
        options: [
          { value: 'public', label: 'Public', description: 'No sensitive data' },
          { value: 'internal', label: 'Internal', description: 'Business data, not public-facing' },
          { value: 'pii', label: 'Contains PII', description: 'Names, emails, addresses, etc.' },
          { value: 'financial', label: 'Financial data', description: 'Payment info, transactions, banking' },
          { value: 'health', label: 'Health / Medical data', description: 'Patient records, health metrics' },
        ],
      },
      {
        type: 'multi-select',
        key: 'complianceStandards',
        label: 'Compliance requirements',
        description: 'Select all that apply',
        options: [
          { value: 'gdpr', label: 'GDPR', description: 'EU data protection' },
          { value: 'hipaa', label: 'HIPAA', description: 'US healthcare data' },
          { value: 'soc2', label: 'SOC 2', description: 'Security & availability controls' },
          { value: 'pci-dss', label: 'PCI-DSS', description: 'Payment card security' },
        ],
      },
      {
        type: 'single-select',
        key: 'dataResidency',
        label: 'Data residency requirements',
        options: [
          { value: 'no-requirement', label: 'No specific requirement' },
          { value: 'specific-region', label: 'Specific country or region' },
          { value: 'not-sure', label: 'Not sure yet' },
        ],
      },
      {
        type: 'conditional',
        parentKey: 'dataResidency',
        showWhen: ['specific-region'],
        question: {
          type: 'text-input',
          key: 'dataResidencyRegion',
          label: 'Which region?',
          placeholder: 'e.g. EU, United States, Australia...',
        },
      },
    ],
  },

  // ── Page 7: Performance & Reliability ─────────────────────────
  {
    id: 'performance',
    title: 'Performance & Reliability',
    description: 'What are your expectations for speed and uptime?',
    icon: Zap,
    questions: [
      {
        type: 'multi-select',
        key: 'realtimeFeatures',
        label: 'Real-time features needed',
        description: 'Select all that apply',
        options: [
          { value: 'live-updates', label: 'Live updates / WebSockets', description: 'Real-time data sync across clients' },
          { value: 'chat-messaging', label: 'Chat / Messaging' },
          { value: 'push-notifications', label: 'Push notifications' },
        ],
      },
      {
        type: 'single-select',
        key: 'offlineCapability',
        label: 'Offline capability',
        options: [
          { value: 'required', label: 'Required', description: 'App must work without internet' },
          { value: 'nice-to-have', label: 'Nice to have' },
          { value: 'not-needed', label: 'Not needed' },
        ],
      },
      {
        type: 'single-select',
        key: 'uptimeTarget',
        label: 'Uptime target',
        options: [
          { value: 'best-effort', label: 'Best effort', description: 'Acceptable occasional downtime' },
          { value: '99.9', label: '99.9%', description: '~8.7 hours downtime per year' },
          { value: '99.99', label: '99.99%', description: '~52 minutes downtime per year' },
        ],
      },
    ],
  },

  // ── Page 8: Geographic Reach ──────────────────────────────────
  {
    id: 'geographic',
    title: 'Geographic Reach',
    description: 'Where are your users located?',
    icon: Globe,
    questions: [
      {
        type: 'single-select',
        key: 'geoDeployment',
        label: 'Deployment reach',
        options: [
          { value: 'single-region', label: 'Single region', description: 'Users primarily in one area' },
          { value: 'multi-region', label: 'Multi-region', description: 'Users spread across several regions' },
          { value: 'global-cdn', label: 'Global CDN', description: 'Users worldwide, content delivered from edge' },
        ],
      },
      {
        type: 'single-select',
        key: 'latencyPriority',
        label: 'Latency priority',
        options: [
          { value: 'fast-critical', label: 'Fast response is critical', description: 'Sub-second responses required' },
          { value: 'moderate', label: 'Moderate is acceptable', description: 'A few seconds is fine' },
          { value: 'not-a-concern', label: 'Not a major concern' },
        ],
      },
      {
        type: 'single-select',
        key: 'concurrentUsers',
        label: 'Expected concurrent users',
        options: [
          { value: 'under-50', label: 'Under 50' },
          { value: '50-500', label: '50 – 500' },
          { value: '500-5k', label: '500 – 5,000' },
          { value: '5k-plus', label: '5,000+' },
        ],
      },
    ],
  },

  // ── Page 9: Third-Party Services ──────────────────────────────
  {
    id: 'third-party',
    title: 'Third-Party Services',
    description: 'Which external services will your app need?',
    icon: CreditCard,
    questions: [
      {
        type: 'single-select',
        key: 'paymentProvider',
        label: 'Payment processing',
        options: [
          { value: 'none', label: 'None needed' },
          { value: 'stripe', label: 'Stripe' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'square', label: 'Square' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        type: 'multi-select',
        key: 'notificationTypes',
        label: 'Notification channels',
        description: 'Select all that apply',
        options: [
          { value: 'transactional-email', label: 'Transactional email', description: 'Confirmations, password resets, etc.' },
          { value: 'sms', label: 'SMS' },
          { value: 'push-notifications', label: 'Push notifications' },
        ],
      },
      {
        type: 'single-select',
        key: 'analyticsProvider',
        label: 'Analytics',
        options: [
          { value: 'none', label: 'None needed' },
          { value: 'google-analytics', label: 'Google Analytics' },
          { value: 'mixpanel', label: 'Mixpanel' },
          { value: 'posthog', label: 'PostHog' },
          { value: 'other', label: 'Other' },
        ],
      },
    ],
  },

  // ── Page 10: Accessibility & i18n ─────────────────────────────
  {
    id: 'accessibility',
    title: 'Accessibility & Internationalization',
    description: 'Who needs to be able to use your app, and in what languages?',
    icon: Languages,
    questions: [
      {
        type: 'single-select',
        key: 'wcagLevel',
        label: 'WCAG accessibility level',
        options: [
          { value: 'a', label: 'Level A', description: 'Minimum accessibility' },
          { value: 'aa', label: 'Level AA', description: 'Recommended standard for most apps' },
          { value: 'aaa', label: 'Level AAA', description: 'Highest level of accessibility' },
        ],
      },
      {
        type: 'single-select',
        key: 'languageSupport',
        label: 'Language support',
        options: [
          { value: 'english-only', label: 'English only' },
          { value: 'multiple', label: 'Multiple languages' },
        ],
      },
      {
        type: 'conditional',
        parentKey: 'languageSupport',
        showWhen: ['multiple'],
        question: {
          type: 'text-input',
          key: 'supportedLanguages',
          label: 'Which languages?',
          placeholder: 'e.g. English, Spanish, French, Mandarin...',
        },
      },
      {
        type: 'single-select',
        key: 'rtlSupport',
        label: 'Right-to-left (RTL) language support',
        description: 'Arabic, Hebrew, Persian, etc.',
        options: [
          { value: 'yes', label: 'Yes, RTL support needed' },
          { value: 'no', label: 'No RTL needed' },
        ],
      },
    ],
  },

  // ── Page 11: Development Preferences ──────────────────────────
  {
    id: 'development',
    title: 'Development Preferences',
    description: 'What does your team and tooling look like?',
    icon: Wrench,
    questions: [
      {
        type: 'multi-select',
        key: 'techStack',
        label: 'Preferred tech stack',
        description: 'Select all that apply',
        options: [
          { value: 'react-nextjs', label: 'React / Next.js' },
          { value: 'vue', label: 'Vue.js' },
          { value: 'angular', label: 'Angular' },
          { value: 'python-django', label: 'Python / Django' },
          { value: 'nodejs', label: 'Node.js' },
          { value: 'go', label: 'Go' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        type: 'conditional',
        parentKey: 'techStack',
        showWhen: ['other'],
        question: {
          type: 'text-input',
          key: 'techStackOther',
          label: 'Other technologies',
          placeholder: 'e.g. Rust, Elixir, Swift, Kotlin...',
        },
      },
      {
        type: 'single-select',
        key: 'teamSize',
        label: 'Team size',
        options: [
          { value: 'solo', label: 'Solo developer' },
          { value: 'small-2-5', label: 'Small team (2-5)' },
          { value: 'medium-6-15', label: 'Medium team (6-15)' },
          { value: 'large-15-plus', label: 'Large team (15+)' },
        ],
      },
      {
        type: 'single-select',
        key: 'ciCdTool',
        label: 'CI/CD tooling',
        options: [
          { value: 'github-actions', label: 'GitHub Actions' },
          { value: 'gitlab-ci', label: 'GitLab CI' },
          { value: 'jenkins', label: 'Jenkins' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        type: 'single-select',
        key: 'monitoringTool',
        label: 'Monitoring & observability',
        options: [
          { value: 'none', label: 'None yet' },
          { value: 'datadog', label: 'Datadog' },
          { value: 'new-relic', label: 'New Relic' },
          { value: 'grafana', label: 'Grafana' },
          { value: 'other', label: 'Other' },
        ],
      },
    ],
  },
];

export const TOTAL_WIZARD_PAGES = WIZARD_PAGES.length;
