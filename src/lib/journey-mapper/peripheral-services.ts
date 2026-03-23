import type { StrategicIntent, NavigationGroup, UiType, Priority } from './types';
import { normalizeIntent } from './types';

// ---------------------------------------------------------------------------
// Peripheral service template
// ---------------------------------------------------------------------------

export interface PeripheralTemplate {
  featureName: string;
  featureDescription: string;
  uiType: UiType;
  uiPatternSuggestion: string;
  addressesPain: string;
  priority: Priority;
  groupId: string;
  /** Hint for which stage this should be placed in */
  stageHint: string;
  /** If set, only include when condition returns true */
  condition?: (ctx: PeripheralContext) => boolean;
}

export interface PeripheralContext {
  challengeText: string;
  personaRole?: string;
  featureCount: number;
}

// ---------------------------------------------------------------------------
// Templates per intent
// ---------------------------------------------------------------------------

const WEB_APP_PERIPHERALS: PeripheralTemplate[] = [
  // Always
  { featureName: 'Login / Sign Up', featureDescription: 'User authentication with email/social login', uiType: 'auth', uiPatternSuggestion: 'Auth page with email + social login buttons, terms checkbox', addressesPain: 'Account access', priority: 'must-have', groupId: 'auth', stageHint: 'awareness' },
  { featureName: 'Onboarding Flow', featureDescription: 'Guided first-time setup to personalize experience', uiType: 'onboarding', uiPatternSuggestion: 'Multi-step onboarding wizard with progress bar and skip option', addressesPain: 'Learning curve', priority: 'must-have', groupId: 'onboarding', stageHint: 'onboarding' },
  { featureName: 'Profile & Settings', featureDescription: 'User profile management and app preferences', uiType: 'settings', uiPatternSuggestion: 'Settings page with tabbed sections: Profile, Preferences, Security', addressesPain: 'Personalization needs', priority: 'should-have', groupId: 'settings', stageHint: 'active-use' },
  { featureName: 'Help & Support', featureDescription: 'Help center with FAQ, docs, and contact support', uiType: 'detail-view', uiPatternSuggestion: 'Help page with searchable FAQ accordion and contact form', addressesPain: 'User confusion', priority: 'should-have', groupId: 'support', stageHint: 'active-use' },
  { featureName: 'Error Pages', featureDescription: '404 and error state pages with recovery paths', uiType: 'error', uiPatternSuggestion: 'Friendly error page with illustration, message, and navigation back', addressesPain: 'Lost users on errors', priority: 'should-have', groupId: 'support', stageHint: 'active-use' },
  // Conditional
  { featureName: 'Search', featureDescription: 'Global search across app content', uiType: 'search', uiPatternSuggestion: 'Command palette or search bar with instant results and filters', addressesPain: 'Finding content in large apps', priority: 'should-have', groupId: 'navigation', stageHint: 'active-use', condition: (ctx) => ctx.featureCount > 10 },
  { featureName: 'Billing & Subscription', featureDescription: 'Subscription management, payment methods, invoices', uiType: 'settings', uiPatternSuggestion: 'Billing page with plan selector, payment form, and invoice history', addressesPain: 'Payment friction', priority: 'should-have', groupId: 'settings', stageHint: 'active-use', condition: (ctx) => /saas|subscription|billing|payment|premium|plan|pricing/i.test(ctx.challengeText) },
  { featureName: 'Notifications', featureDescription: 'In-app notification center for updates and alerts', uiType: 'detail-view', uiPatternSuggestion: 'Notification dropdown with read/unread states and category filters', addressesPain: 'Missing important updates', priority: 'nice-to-have', groupId: 'navigation', stageHint: 'active-use', condition: (ctx) => /notify|alert|update|real-time|collaborate|team/i.test(ctx.challengeText) },
];

const ADMIN_PORTAL_PERIPHERALS: PeripheralTemplate[] = [
  { featureName: 'Admin Login (SSO)', featureDescription: 'Admin authentication with SSO/SAML support', uiType: 'auth', uiPatternSuggestion: 'Login page with SSO button, email fallback, and MFA prompt', addressesPain: 'Secure admin access', priority: 'must-have', groupId: 'auth', stageHint: 'auth' },
  { featureName: 'User Management', featureDescription: 'Manage users, roles, and permissions', uiType: 'table', uiPatternSuggestion: 'User list table with role assignment, invite, and deactivate actions', addressesPain: 'Access control', priority: 'must-have', groupId: 'admin', stageHint: 'manage' },
  { featureName: 'Audit Log', featureDescription: 'Activity log of all admin actions for compliance', uiType: 'table', uiPatternSuggestion: 'Filterable activity log with timestamp, user, action, and entity columns', addressesPain: 'Accountability gaps', priority: 'must-have', groupId: 'admin', stageHint: 'audit' },
  { featureName: 'System Settings', featureDescription: 'Global configuration and feature flags', uiType: 'settings', uiPatternSuggestion: 'Settings page with categorized toggles, inputs, and save/reset buttons', addressesPain: 'Configuration needs', priority: 'should-have', groupId: 'settings', stageHint: 'configure' },
  { featureName: 'Error Pages', featureDescription: '403/404/500 error pages with admin-appropriate messaging', uiType: 'error', uiPatternSuggestion: 'Error page with status code, description, and link back to dashboard', addressesPain: 'Lost admins on errors', priority: 'should-have', groupId: 'support', stageHint: 'overview' },
  { featureName: 'Import / Export', featureDescription: 'Bulk data import and export tools', uiType: 'wizard', uiPatternSuggestion: 'Import wizard with file upload, mapping, preview, and confirm steps', addressesPain: 'Manual data entry overhead', priority: 'should-have', groupId: 'admin', stageHint: 'manage', condition: (ctx) => /data|import|export|csv|bulk|migration/i.test(ctx.challengeText) },
  { featureName: 'Notifications', featureDescription: 'Admin notifications for system events and approvals', uiType: 'detail-view', uiPatternSuggestion: 'Notification panel with approval requests, system alerts, and user reports', addressesPain: 'Missing critical events', priority: 'nice-to-have', groupId: 'navigation', stageHint: 'overview', condition: (ctx) => /workflow|approve|review|queue/i.test(ctx.challengeText) },
];

const DASHBOARD_PERIPHERALS: PeripheralTemplate[] = [
  { featureName: 'Login', featureDescription: 'Secure dashboard authentication', uiType: 'auth', uiPatternSuggestion: 'Login page with email/password and SSO options', addressesPain: 'Data access security', priority: 'must-have', groupId: 'auth', stageHint: 'load' },
  { featureName: 'Profile & Preferences', featureDescription: 'User profile and dashboard display preferences', uiType: 'settings', uiPatternSuggestion: 'Settings with default date range, timezone, and notification prefs', addressesPain: 'Personalization needs', priority: 'should-have', groupId: 'settings', stageHint: 'action' },
  { featureName: 'Export Center', featureDescription: 'Export data and reports in multiple formats', uiType: 'detail-view', uiPatternSuggestion: 'Export dialog with format selection (CSV, PDF, PNG), date range, and email option', addressesPain: 'Sharing insights externally', priority: 'should-have', groupId: 'tools', stageHint: 'action' },
  { featureName: 'Error States', featureDescription: 'Data loading errors and empty states', uiType: 'error', uiPatternSuggestion: 'Inline error cards with retry button and fallback cached data notice', addressesPain: 'Data unavailability', priority: 'should-have', groupId: 'support', stageHint: 'load' },
  { featureName: 'Notifications', featureDescription: 'Alert rules and real-time threshold notifications', uiType: 'detail-view', uiPatternSuggestion: 'Notification center with threshold alerts and anomaly detection', addressesPain: 'Missing critical metric changes', priority: 'nice-to-have', groupId: 'tools', stageHint: 'overview', condition: (ctx) => /real-time|alert|threshold|monitor/i.test(ctx.challengeText) },
];

const TOOL_PERIPHERALS: PeripheralTemplate[] = [
  { featureName: 'Error Handling', featureDescription: 'Friendly error states with suggestions', uiType: 'error', uiPatternSuggestion: 'Inline error message with what went wrong and how to fix it', addressesPain: 'Confusing failures', priority: 'must-have', groupId: 'support', stageHint: 'process' },
  { featureName: 'Help / FAQ', featureDescription: 'Usage instructions and common questions', uiType: 'detail-view', uiPatternSuggestion: 'Collapsible help sidebar or modal with examples and tips', addressesPain: 'Not knowing how to use the tool', priority: 'should-have', groupId: 'support', stageHint: 'input' },
  { featureName: 'Login / Save', featureDescription: 'Optional auth for saving and sharing results', uiType: 'auth', uiPatternSuggestion: 'Lightweight auth modal triggered by save/share action', addressesPain: 'Losing results', priority: 'nice-to-have', groupId: 'auth', stageHint: 'export', condition: (ctx) => /save|share|history|account/i.test(ctx.challengeText) },
  { featureName: 'Settings', featureDescription: 'Tool configuration and defaults', uiType: 'settings', uiPatternSuggestion: 'Settings panel with default values, output format preferences', addressesPain: 'Repetitive configuration', priority: 'nice-to-have', groupId: 'settings', stageHint: 'input', condition: (ctx) => /config|preference|customize|option/i.test(ctx.challengeText) },
];

const MARKETING_SITE_PERIPHERALS: PeripheralTemplate[] = [
  { featureName: 'Header Navigation', featureDescription: 'Sticky header with logo, nav links, and CTA button', uiType: 'landing-page', uiPatternSuggestion: 'Sticky header nav with logo, anchor links, and primary CTA', addressesPain: 'Navigation between sections', priority: 'must-have', groupId: 'navigation', stageHint: 'awareness' },
  { featureName: 'Footer', featureDescription: 'Site footer with links, social, legal', uiType: 'landing-page', uiPatternSuggestion: 'Multi-column footer with nav links, social icons, copyright, and legal links', addressesPain: 'Missing legal / contact info', priority: 'must-have', groupId: 'navigation', stageHint: 'purchase' },
  { featureName: '404 Page', featureDescription: 'Friendly not-found page with navigation back', uiType: 'error', uiPatternSuggestion: 'Branded 404 page with illustration and link back to homepage', addressesPain: 'Dead links lose visitors', priority: 'should-have', groupId: 'support', stageHint: 'awareness' },
  { featureName: 'Privacy Policy', featureDescription: 'Privacy and terms pages for compliance', uiType: 'detail-view', uiPatternSuggestion: 'Clean text page with table of contents sidebar', addressesPain: 'Legal compliance', priority: 'should-have', groupId: 'legal', stageHint: 'decision' },
  { featureName: 'Contact Form', featureDescription: 'Contact or inquiry form for leads', uiType: 'form', uiPatternSuggestion: 'Simple contact form with name, email, message, and success confirmation', addressesPain: 'No way to reach out', priority: 'should-have', groupId: 'conversion', stageHint: 'decision', condition: (ctx) => /contact|inquir|reach|support|enterprise/i.test(ctx.challengeText) },
  { featureName: 'Newsletter Signup', featureDescription: 'Email capture for lead generation', uiType: 'form', uiPatternSuggestion: 'Inline email input with subscribe button and privacy note', addressesPain: 'Losing interested visitors', priority: 'nice-to-have', groupId: 'conversion', stageHint: 'consideration', condition: (ctx) => /newsletter|lead|email|subscribe|waitlist|launch/i.test(ctx.challengeText) },
  { featureName: 'Checkout', featureDescription: 'E-commerce checkout flow', uiType: 'wizard', uiPatternSuggestion: 'Multi-step checkout: cart → shipping → payment → confirmation', addressesPain: 'Cart abandonment', priority: 'must-have', groupId: 'conversion', stageHint: 'purchase', condition: (ctx) => /ecommerce|e-commerce|store|shop|buy|purchase|checkout|cart/i.test(ctx.challengeText) },
];

const PERIPHERAL_MAP: Record<string, PeripheralTemplate[]> = {
  'web-app': WEB_APP_PERIPHERALS,
  'admin-portal': ADMIN_PORTAL_PERIPHERALS,
  'dashboard': DASHBOARD_PERIPHERALS,
  'tool': TOOL_PERIPHERALS,
  'marketing-site': MARKETING_SITE_PERIPHERALS,
};

// ---------------------------------------------------------------------------
// Default navigation groups per intent
// ---------------------------------------------------------------------------

const DEFAULT_GROUPS: Record<string, NavigationGroup[]> = {
  'web-app': [
    { id: 'main', label: 'Main App', description: 'Core application features' },
    { id: 'auth', label: 'Authentication', description: 'Login, signup, password recovery' },
    { id: 'onboarding', label: 'Onboarding', description: 'First-time user experience' },
    { id: 'settings', label: 'Settings', description: 'Profile, preferences, billing' },
    { id: 'navigation', label: 'Navigation', description: 'Search, notifications, nav elements' },
    { id: 'support', label: 'Support', description: 'Help, errors, support pages' },
  ],
  'admin-portal': [
    { id: 'main', label: 'Admin Views', description: 'Core admin management views' },
    { id: 'auth', label: 'Authentication', description: 'Admin login and SSO' },
    { id: 'admin', label: 'Administration', description: 'User management, audit, import/export' },
    { id: 'settings', label: 'Configuration', description: 'System settings and feature flags' },
    { id: 'navigation', label: 'Navigation', description: 'Notifications, search' },
    { id: 'support', label: 'Support', description: 'Error pages, help' },
  ],
  'dashboard': [
    { id: 'main', label: 'Dashboard', description: 'Core metrics and visualizations' },
    { id: 'auth', label: 'Authentication', description: 'Login and access control' },
    { id: 'settings', label: 'Settings', description: 'Profile and display preferences' },
    { id: 'tools', label: 'Tools', description: 'Export, notifications, utilities' },
    { id: 'support', label: 'Support', description: 'Error states, help' },
  ],
  'tool': [
    { id: 'main', label: 'Tool', description: 'Core tool functionality' },
    { id: 'auth', label: 'Account', description: 'Optional auth for saving' },
    { id: 'settings', label: 'Settings', description: 'Tool configuration' },
    { id: 'support', label: 'Support', description: 'Help, error handling' },
  ],
  'marketing-site': [
    { id: 'main', label: 'Content', description: 'Main site content sections' },
    { id: 'navigation', label: 'Navigation', description: 'Header, footer, nav elements' },
    { id: 'conversion', label: 'Conversion', description: 'Contact form, newsletter, checkout' },
    { id: 'legal', label: 'Legal', description: 'Privacy, terms, compliance' },
    { id: 'support', label: 'Support', description: '404, error pages' },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildPeripheralContext(
  challengeText: string,
  persona?: string | null,
  featureCount?: number
): PeripheralContext {
  return {
    challengeText: challengeText.toLowerCase(),
    personaRole: persona?.toLowerCase(),
    featureCount: featureCount ?? 0,
  };
}

export function selectPeripheralServices(
  intent: StrategicIntent,
  context: PeripheralContext
): PeripheralTemplate[] {
  const normalized = normalizeIntent(intent);
  const templates = PERIPHERAL_MAP[normalized] || WEB_APP_PERIPHERALS;

  return templates.filter((t) => {
    if (!t.condition) return true;
    return t.condition(context);
  });
}

export function getDefaultGroups(intent: StrategicIntent): NavigationGroup[] {
  const normalized = normalizeIntent(intent);
  return DEFAULT_GROUPS[normalized] || DEFAULT_GROUPS['web-app'];
}
