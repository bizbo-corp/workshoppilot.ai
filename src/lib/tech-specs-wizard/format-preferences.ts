import { AI_DECIDE, type TechSpecsPreferences } from './types';
import { WIZARD_PAGES } from './wizard-pages';

/** Resolve a human-readable label for a single option value. */
function labelFor(pageId: string, key: string, value: string): string {
  const page = WIZARD_PAGES.find((p) => p.id === pageId);
  if (!page) return value;

  for (const q of page.questions) {
    const actual = q.type === 'conditional' ? q.question : q;
    if (actual.key === key && actual.type !== 'text-input') {
      const opt = actual.options.find((o) => o.value === value);
      if (opt) return opt.label;
    }
  }
  return value;
}

function labelsFor(pageId: string, key: string, values: string[]): string {
  return values.map((v) => labelFor(pageId, key, v)).join(', ');
}

type LineEntry = { heading: string; value: string };

/**
 * Converts user preferences into a structured text block for injection into the
 * tech-specs generation prompt. Returns `null` if every field is AI_DECIDE.
 */
export function formatPreferencesForPrompt(prefs: TechSpecsPreferences): string | null {
  const lines: LineEntry[] = [];

  const add = (heading: string, value: string | undefined | null) => {
    if (value) lines.push({ heading, value });
  };

  // Page 1: Platform
  if (prefs.platform !== AI_DECIDE) {
    let platformStr = labelFor('platform', 'platform', prefs.platform);
    if (prefs.mobileTarget !== AI_DECIDE) {
      platformStr += ` — Mobile: ${labelFor('platform', 'mobileTarget', prefs.mobileTarget)}`;
    }
    if (prefs.webArchitecture !== AI_DECIDE) {
      platformStr += ` — Web: ${labelFor('platform', 'webArchitecture', prefs.webArchitecture)}`;
    }
    add('PLATFORM', platformStr);
  }

  // Page 2: Hosting
  if (prefs.hostingProvider !== AI_DECIDE) {
    let hostStr = labelFor('hosting', 'hostingProvider', prefs.hostingProvider);
    if (prefs.deploymentArch !== AI_DECIDE) {
      hostStr += `, ${labelFor('hosting', 'deploymentArch', prefs.deploymentArch)}`;
    }
    add('HOSTING', hostStr);
  } else if (prefs.deploymentArch !== AI_DECIDE) {
    add('DEPLOYMENT', labelFor('hosting', 'deploymentArch', prefs.deploymentArch));
  }

  // Page 3: Existing Systems
  if (prefs.projectType !== AI_DECIDE) {
    add('PROJECT TYPE', labelFor('integrations', 'projectType', prefs.projectType));
  }
  if (prefs.existingApis.trim()) {
    add('EXISTING INTEGRATIONS', prefs.existingApis.trim());
  }
  if (prefs.identityProvider !== AI_DECIDE) {
    add('IDENTITY PROVIDER', labelFor('integrations', 'identityProvider', prefs.identityProvider));
  }

  // Page 4: Auth & Users
  if (prefs.authMethods !== AI_DECIDE) {
    add('AUTHENTICATION', labelsFor('auth', 'authMethods', prefs.authMethods));
  }
  if (prefs.userRoleComplexity !== AI_DECIDE) {
    add('USER ROLES', labelFor('auth', 'userRoleComplexity', prefs.userRoleComplexity));
  }
  if (prefs.userScale !== AI_DECIDE) {
    add('EXPECTED USERS', labelFor('auth', 'userScale', prefs.userScale));
  }

  // Page 5: Data & Storage
  if (prefs.dataTypes !== AI_DECIDE) {
    add('DATA TYPES', labelsFor('data', 'dataTypes', prefs.dataTypes));
  }
  if (prefs.databaseType !== AI_DECIDE) {
    add('DATABASE', labelFor('data', 'databaseType', prefs.databaseType));
  }
  if (prefs.fileStorage !== AI_DECIDE) {
    add('FILE STORAGE', labelFor('data', 'fileStorage', prefs.fileStorage));
  }

  // Page 6: Security & Compliance
  if (prefs.dataSensitivity !== AI_DECIDE) {
    add('DATA SENSITIVITY', labelFor('security', 'dataSensitivity', prefs.dataSensitivity));
  }
  if (prefs.complianceStandards !== AI_DECIDE) {
    add('COMPLIANCE', labelsFor('security', 'complianceStandards', prefs.complianceStandards));
  }
  if (prefs.dataResidency !== AI_DECIDE) {
    let resStr = labelFor('security', 'dataResidency', prefs.dataResidency);
    if (prefs.dataResidency === 'specific-region' && prefs.dataResidencyRegion.trim()) {
      resStr += `: ${prefs.dataResidencyRegion.trim()}`;
    }
    add('DATA RESIDENCY', resStr);
  }

  // Page 7: Performance & Reliability
  if (prefs.realtimeFeatures !== AI_DECIDE) {
    add('REAL-TIME FEATURES', labelsFor('performance', 'realtimeFeatures', prefs.realtimeFeatures));
  }
  if (prefs.offlineCapability !== AI_DECIDE) {
    add('OFFLINE CAPABILITY', labelFor('performance', 'offlineCapability', prefs.offlineCapability));
  }
  if (prefs.uptimeTarget !== AI_DECIDE) {
    add('UPTIME TARGET', labelFor('performance', 'uptimeTarget', prefs.uptimeTarget));
  }

  // Page 8: Geographic Reach
  if (prefs.geoDeployment !== AI_DECIDE) {
    add('GEOGRAPHIC DEPLOYMENT', labelFor('geographic', 'geoDeployment', prefs.geoDeployment));
  }
  if (prefs.latencyPriority !== AI_DECIDE) {
    add('LATENCY PRIORITY', labelFor('geographic', 'latencyPriority', prefs.latencyPriority));
  }
  if (prefs.concurrentUsers !== AI_DECIDE) {
    add('CONCURRENT USERS', labelFor('geographic', 'concurrentUsers', prefs.concurrentUsers));
  }

  // Page 9: Third-Party Services
  if (prefs.paymentProvider !== AI_DECIDE) {
    add('PAYMENTS', labelFor('third-party', 'paymentProvider', prefs.paymentProvider));
  }
  if (prefs.notificationTypes !== AI_DECIDE) {
    add('NOTIFICATIONS', labelsFor('third-party', 'notificationTypes', prefs.notificationTypes));
  }
  if (prefs.analyticsProvider !== AI_DECIDE) {
    add('ANALYTICS', labelFor('third-party', 'analyticsProvider', prefs.analyticsProvider));
  }

  // Page 10: Accessibility & i18n
  if (prefs.wcagLevel !== AI_DECIDE) {
    add('ACCESSIBILITY', `WCAG ${labelFor('accessibility', 'wcagLevel', prefs.wcagLevel)}`);
  }
  if (prefs.languageSupport !== AI_DECIDE) {
    let langStr = labelFor('accessibility', 'languageSupport', prefs.languageSupport);
    if (prefs.languageSupport === 'multiple' && prefs.supportedLanguages.trim()) {
      langStr += `: ${prefs.supportedLanguages.trim()}`;
    }
    add('LANGUAGES', langStr);
  }
  if (prefs.rtlSupport !== AI_DECIDE) {
    add('RTL SUPPORT', labelFor('accessibility', 'rtlSupport', prefs.rtlSupport));
  }

  // Page 11: Development Preferences
  if (prefs.techStack !== AI_DECIDE) {
    let stackStr = labelsFor('development', 'techStack', prefs.techStack);
    if (prefs.techStack.includes('other') && prefs.techStackOther.trim()) {
      stackStr += ` (${prefs.techStackOther.trim()})`;
    }
    add('TECH STACK', stackStr);
  }
  if (prefs.teamSize !== AI_DECIDE) {
    add('TEAM SIZE', labelFor('development', 'teamSize', prefs.teamSize));
  }
  if (prefs.ciCdTool !== AI_DECIDE) {
    add('CI/CD', labelFor('development', 'ciCdTool', prefs.ciCdTool));
  }
  if (prefs.monitoringTool !== AI_DECIDE) {
    add('MONITORING', labelFor('development', 'monitoringTool', prefs.monitoringTool));
  }

  if (lines.length === 0) return null;

  const formatted = lines.map((l) => `${l.heading}: ${l.value}`).join('\n');

  return `<technical_requirements>
The user has specified the following technical requirements. These are AUTHORITATIVE —
you MUST incorporate them into the Technical Specifications. Do NOT contradict these choices.
Where a topic is not listed below, the user deferred to AI — use your best judgment based on the workshop data.

${formatted}
</technical_requirements>

IMPORTANT: The technical_requirements section above contains the user's explicit technical choices.
These are AUTHORITATIVE and must be reflected in the System Overview, Technical Requirements,
Data Model, API Design, Integration Requirements, Security & Privacy, and Performance Requirements
sections.`;
}
