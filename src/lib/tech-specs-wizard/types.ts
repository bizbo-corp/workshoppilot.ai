import type { IconName } from '@/components/ui/icon';

export const AI_DECIDE = '__ai_decide__' as const;
export type AiDecide = typeof AI_DECIDE;

// ── Preference value types ──────────────────────────────────────────

export type PlatformType = 'responsive-web' | 'native-mobile' | 'desktop' | 'pwa' | 'combination';
export type MobileTarget = 'ios' | 'android' | 'both';
export type WebArchitecture = 'spa' | 'ssr' | 'static';
export type HostingProvider = 'aws' | 'gcp' | 'azure' | 'vercel' | 'netlify' | 'self-hosted' | 'other';
export type DeploymentArch = 'serverless' | 'containers' | 'traditional-vm';
export type ProjectType = 'greenfield' | 'extending-existing';
export type IdentityProvider = 'none' | 'okta' | 'auth0' | 'azure-ad' | 'firebase-auth' | 'other';
export type AuthMethod = 'email-password' | 'social-login' | 'sso-saml' | 'magic-link' | 'mfa';
export type UserRoleComplexity = 'single-role' | '2-3-roles' | 'complex-hierarchy';
export type UserScale = 'under-100' | '100-10k' | '10k-100k' | '100k-plus';
export type DataType = 'structured' | 'documents' | 'media' | 'time-series';
export type DatabaseType = 'relational' | 'nosql' | 'graph';
export type FileStorageType = 'none' | 'images-only' | 'documents' | 'rich-media';
export type DataSensitivity = 'public' | 'internal' | 'pii' | 'financial' | 'health';
export type ComplianceStandard = 'gdpr' | 'hipaa' | 'soc2' | 'pci-dss';
export type DataResidency = 'no-requirement' | 'specific-region' | 'not-sure';
export type RealtimeFeature = 'live-updates' | 'chat-messaging' | 'push-notifications';
export type OfflineCapability = 'required' | 'nice-to-have' | 'not-needed';
export type UptimeTarget = 'best-effort' | '99.9' | '99.99';
export type GeoDeployment = 'single-region' | 'multi-region' | 'global-cdn';
export type LatencyPriority = 'fast-critical' | 'moderate' | 'not-a-concern';
export type ConcurrentUsers = 'under-50' | '50-500' | '500-5k' | '5k-plus';
export type PaymentProvider = 'none' | 'stripe' | 'paypal' | 'square' | 'other';
export type NotificationType = 'transactional-email' | 'sms' | 'push-notifications';
export type AnalyticsProvider = 'none' | 'google-analytics' | 'mixpanel' | 'posthog' | 'other';
export type WcagLevel = 'a' | 'aa' | 'aaa';
export type LanguageSupport = 'english-only' | 'multiple';
export type RtlSupport = 'yes' | 'no';
export type TechStack = 'react-nextjs' | 'vue' | 'angular' | 'python-django' | 'nodejs' | 'go' | 'other';
export type TeamSize = 'solo' | 'small-2-5' | 'medium-6-15' | 'large-15-plus';
export type CiCdTool = 'github-actions' | 'gitlab-ci' | 'jenkins' | 'other';
export type MonitoringTool = 'none' | 'datadog' | 'new-relic' | 'grafana' | 'other';

// ── Preferences object ──────────────────────────────────────────────

export interface TechSpecsPreferences {
  // Page 1: Platform
  platform: PlatformType | AiDecide;
  mobileTarget: MobileTarget | AiDecide;
  webArchitecture: WebArchitecture | AiDecide;

  // Page 2: Hosting
  hostingProvider: HostingProvider | AiDecide;
  deploymentArch: DeploymentArch | AiDecide;

  // Page 3: Existing Systems
  projectType: ProjectType | AiDecide;
  existingApis: string;
  identityProvider: IdentityProvider | AiDecide;

  // Page 4: Auth & Users
  authMethods: AuthMethod[] | AiDecide;
  userRoleComplexity: UserRoleComplexity | AiDecide;
  userScale: UserScale | AiDecide;

  // Page 5: Data & Storage
  dataTypes: DataType[] | AiDecide;
  databaseType: DatabaseType | AiDecide;
  fileStorage: FileStorageType | AiDecide;

  // Page 6: Security & Compliance
  dataSensitivity: DataSensitivity | AiDecide;
  complianceStandards: ComplianceStandard[] | AiDecide;
  dataResidency: DataResidency | AiDecide;
  dataResidencyRegion: string;

  // Page 7: Performance & Reliability
  realtimeFeatures: RealtimeFeature[] | AiDecide;
  offlineCapability: OfflineCapability | AiDecide;
  uptimeTarget: UptimeTarget | AiDecide;

  // Page 8: Geographic Reach
  geoDeployment: GeoDeployment | AiDecide;
  latencyPriority: LatencyPriority | AiDecide;
  concurrentUsers: ConcurrentUsers | AiDecide;

  // Page 9: Third-Party Services
  paymentProvider: PaymentProvider | AiDecide;
  notificationTypes: NotificationType[] | AiDecide;
  analyticsProvider: AnalyticsProvider | AiDecide;

  // Page 10: Accessibility & i18n
  wcagLevel: WcagLevel | AiDecide;
  languageSupport: LanguageSupport | AiDecide;
  supportedLanguages: string;
  rtlSupport: RtlSupport | AiDecide;

  // Page 11: Development Preferences
  techStack: TechStack[] | AiDecide;
  techStackOther: string;
  teamSize: TeamSize | AiDecide;
  ciCdTool: CiCdTool | AiDecide;
  monitoringTool: MonitoringTool | AiDecide;
}

// ── Wizard page config ──────────────────────────────────────────────

export interface WizardOption {
  value: string;
  label: string;
  description?: string;
  icon?: IconName;
}

export interface WizardQuestionBase {
  key: keyof TechSpecsPreferences;
  label: string;
  description?: string;
}

export interface SingleSelectQuestion extends WizardQuestionBase {
  type: 'single-select';
  options: WizardOption[];
}

export interface MultiSelectQuestion extends WizardQuestionBase {
  type: 'multi-select';
  options: WizardOption[];
}

export interface TextInputQuestion extends WizardQuestionBase {
  type: 'text-input';
  placeholder?: string;
}

export interface ConditionalQuestion {
  type: 'conditional';
  parentKey: keyof TechSpecsPreferences;
  showWhen: string[];
  question: SingleSelectQuestion | MultiSelectQuestion | TextInputQuestion;
}

export type WizardQuestion = SingleSelectQuestion | MultiSelectQuestion | TextInputQuestion | ConditionalQuestion;

export interface WizardPageConfig {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  questions: WizardQuestion[];
}
