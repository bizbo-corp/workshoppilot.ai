import { AI_DECIDE, type TechSpecsPreferences } from './types';

export function createDefaultPreferences(): TechSpecsPreferences {
  return {
    // Page 1: Platform
    platform: AI_DECIDE,
    mobileTarget: AI_DECIDE,
    webArchitecture: AI_DECIDE,

    // Page 2: Hosting
    hostingProvider: AI_DECIDE,
    deploymentArch: AI_DECIDE,

    // Page 3: Existing Systems
    projectType: AI_DECIDE,
    existingApis: '',
    identityProvider: AI_DECIDE,

    // Page 4: Auth & Users
    authMethods: AI_DECIDE,
    userRoleComplexity: AI_DECIDE,
    userScale: AI_DECIDE,

    // Page 5: Data & Storage
    dataTypes: AI_DECIDE,
    databaseType: AI_DECIDE,
    fileStorage: AI_DECIDE,

    // Page 6: Security & Compliance
    dataSensitivity: AI_DECIDE,
    complianceStandards: AI_DECIDE,
    dataResidency: AI_DECIDE,
    dataResidencyRegion: '',

    // Page 7: Performance & Reliability
    realtimeFeatures: AI_DECIDE,
    offlineCapability: AI_DECIDE,
    uptimeTarget: AI_DECIDE,

    // Page 8: Geographic Reach
    geoDeployment: AI_DECIDE,
    latencyPriority: AI_DECIDE,
    concurrentUsers: AI_DECIDE,

    // Page 9: Third-Party Services
    paymentProvider: AI_DECIDE,
    notificationTypes: AI_DECIDE,
    analyticsProvider: AI_DECIDE,

    // Page 10: Accessibility & i18n
    wcagLevel: AI_DECIDE,
    languageSupport: AI_DECIDE,
    supportedLanguages: '',
    rtlSupport: AI_DECIDE,

    // Page 11: Development Preferences
    techStack: AI_DECIDE,
    techStackOther: '',
    teamSize: AI_DECIDE,
    ciCdTool: AI_DECIDE,
    monitoringTool: AI_DECIDE,
  };
}
