// Bot detection utility to filter out automated traffic

interface BotDetectionResult {
  isBot: boolean;
  reason?: string;
}

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
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
  'spider',
  'crawler',
  'bot',
  'scrapy',
  'python-requests',
  'curl',
  'wget',
  'go-http-client',
  'axios',
  'postman',
];

export const detectBot = (): BotDetectionResult => {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return { isBot: true, reason: 'Not in browser environment' };
  }

  // Check for headless browser
  if (navigator.webdriver) {
    return { isBot: true, reason: 'Webdriver detected' };
  }

  // Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  for (const botPattern of BOT_USER_AGENTS) {
    if (userAgent.includes(botPattern)) {
      return { isBot: true, reason: `Bot user agent: ${botPattern}` };
    }
  }

  // Check for missing browser features
  if (!navigator.languages || navigator.languages.length === 0) {
    return { isBot: true, reason: 'No languages detected' };
  }

  // Check for suspicious screen dimensions
  if (screen.width === 0 || screen.height === 0) {
    return { isBot: true, reason: 'Invalid screen dimensions' };
  }

  // Check for presence of plugins (headless browsers often have none)
  if (navigator.plugins && navigator.plugins.length === 0 && !userAgent.includes('mobile')) {
    // Mobile devices legitimately have no plugins, so exclude them
    return { isBot: true, reason: 'No browser plugins' };
  }

  // Check for Chrome headless
  if (userAgent.includes('headless')) {
    return { isBot: true, reason: 'Headless browser detected' };
  }

  // Check for automation frameworks
  // @ts-ignore - checking for automation properties
  if (window.callPhantom || window._phantom || window.phantom) {
    return { isBot: true, reason: 'PhantomJS detected' };
  }

  // @ts-ignore
  if (window.__nightmare) {
    return { isBot: true, reason: 'Nightmare detected' };
  }

  // All checks passed - likely human
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
