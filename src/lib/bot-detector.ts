// Bot detection utility to filter out automated traffic

interface BotDetectionResult {
  isBot: boolean;
  reason?: string;
}

// Only block obvious scrapers and malicious bots
// Whitelist legitimate bots for SEO/social media
const MALICIOUS_BOT_USER_AGENTS = [
  'scrapy',
  'python-requests',
  'curl',
  'wget',
  'go-http-client',
  'axios',
  'postman',
  'selenium',
  'headless',
  'phantom',
];

// Bots we want to allow for SEO/social media but not track in analytics
const LEGITIMATE_BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'slackbot',
  'discordbot',
  'applebot',
  'pinterest',
  'tumblr',
];

export const detectBot = (): BotDetectionResult => {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return { isBot: true, reason: 'Not in browser environment' };
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for malicious scrapers first
  for (const botPattern of MALICIOUS_BOT_USER_AGENTS) {
    if (userAgent.includes(botPattern)) {
      console.log('[Analytics] Blocked malicious bot:', botPattern);
      return { isBot: true, reason: `Malicious bot: ${botPattern}` };
    }
  }

  // Check for legitimate bots (for tracking purposes only)
  for (const botPattern of LEGITIMATE_BOT_USER_AGENTS) {
    if (userAgent.includes(botPattern)) {
      console.log('[Analytics] Detected legitimate bot:', botPattern);
      return { isBot: true, reason: `Legitimate bot: ${botPattern}` };
    }
  }

  // Check for headless browser indicators
  if (navigator.webdriver) {
    console.log('[Analytics] Detected webdriver');
    return { isBot: true, reason: 'Webdriver detected' };
  }

  // Check for automation frameworks
  // @ts-ignore - checking for automation properties
  if (window.callPhantom || window._phantom || window.phantom) {
    console.log('[Analytics] Detected PhantomJS');
    return { isBot: true, reason: 'PhantomJS detected' };
  }

  // @ts-ignore
  if (window.__nightmare) {
    console.log('[Analytics] Detected Nightmare');
    return { isBot: true, reason: 'Nightmare detected' };
  }

  // Less aggressive checks - only flag if multiple red flags
  const redFlags: string[] = [];

  if (!navigator.languages || navigator.languages.length === 0) {
    redFlags.push('no_languages');
  }

  if (screen.width === 0 || screen.height === 0) {
    redFlags.push('invalid_screen');
  }

  // Only flag as bot if multiple red flags (avoid false positives)
  if (redFlags.length >= 2) {
    console.log('[Analytics] Multiple bot indicators:', redFlags);
    return { isBot: true, reason: `Multiple bot indicators: ${redFlags.join(', ')}` };
  }

  // All checks passed - likely human
  console.log('[Analytics] Human visitor detected');
  return { isBot: false };
};

export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export const getBrowserName = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
};

export const generateSessionId = (): string => {
  // Check for existing session ID in sessionStorage
  const existing = sessionStorage.getItem('visitor_session_id');
  if (existing) return existing;

  // Generate new session ID
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem('visitor_session_id', sessionId);
  return sessionId;
};
