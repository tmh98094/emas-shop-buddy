import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { detectBot, generateSessionId, getDeviceType, getBrowserName } from '@/lib/bot-detector';

export const useAnalytics = () => {
  const location = useLocation();
  const [isBot, setIsBot] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pageViewsRef = useRef<string[]>([]);
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    // Detect bot on mount
    const botCheck = detectBot();
    setIsBot(botCheck.isBot);

    if (botCheck.isBot) {
      console.log('Bot detected, skipping analytics:', botCheck.reason);
      return;
    }

    // Generate or retrieve session ID
    sessionIdRef.current = generateSessionId();

    // Initialize analytics session
    initializeSession();
  }, []);

  useEffect(() => {
    if (isBot || !sessionIdRef.current) return;

    // Track page view
    trackPageView(location.pathname);

    // Update analytics every 30 seconds while on page
    const interval = setInterval(() => {
      updateSession();
    }, 30000);

    return () => clearInterval(interval);
  }, [location.pathname, isBot]);

  const initializeSession = async () => {
    if (!sessionIdRef.current) {
      console.error('[Analytics] No session ID available');
      return;
    }

    try {
      console.log('[Analytics] Initializing session:', sessionIdRef.current);

      const { data: existingSession, error: selectError } = await supabase
        .from('visitor_analytics')
        .select('*')
        .eq('session_id', sessionIdRef.current)
        .maybeSingle();

      if (selectError) {
        console.error('[Analytics] Error checking existing session:', selectError);
      }

      if (!existingSession) {
        // Create new session
        const params = new URLSearchParams(window.location.search);
        const { data: { user } } = await supabase.auth.getUser();
        
        const sessionData = {
          session_id: sessionIdRef.current,
          user_id: user?.id || null,
          first_visit: new Date().toISOString(),
          last_visit: new Date().toISOString(),
          page_views: 1,
          pages_visited: [location.pathname],
          referrer: document.referrer || null,
          utm_source: params.get('utm_source') || null,
          utm_medium: params.get('utm_medium') || null,
          utm_campaign: params.get('utm_campaign') || null,
          device_type: getDeviceType(),
          browser: getBrowserName(),
          is_bot: false,
          session_duration: 0,
        };

        console.log('[Analytics] Creating new session:', sessionData);

        const { error: insertError } = await supabase
          .from('visitor_analytics')
          .insert(sessionData);

        if (insertError) {
          console.error('[Analytics] Failed to create session:', insertError);
          // Retry once after 2 seconds
          setTimeout(async () => {
            console.log('[Analytics] Retrying session creation...');
            const { error: retryError } = await supabase
              .from('visitor_analytics')
              .insert(sessionData);
            if (retryError) {
              console.error('[Analytics] Retry failed:', retryError);
            } else {
              console.log('[Analytics] Retry succeeded');
            }
          }, 2000);
        } else {
          console.log('[Analytics] Session created successfully');
        }

        pageViewsRef.current = [location.pathname];
      } else {
        console.log('[Analytics] Existing session found:', existingSession);
        pageViewsRef.current = Array.isArray(existingSession.pages_visited) 
          ? (existingSession.pages_visited as string[])
          : [];
      }
    } catch (error) {
      console.error('[Analytics] Unexpected error during initialization:', error);
    }
  };

  const trackPageView = async (pathname: string) => {
    if (!sessionIdRef.current || isBot) return;

    // Avoid duplicate tracking
    if (pageViewsRef.current[pageViewsRef.current.length - 1] === pathname) {
      return;
    }

    pageViewsRef.current.push(pathname);

    try {
      console.log('[Analytics] Tracking page view:', pathname);
      const { error } = await supabase
        .from('visitor_analytics')
        .update({
          last_visit: new Date().toISOString(),
          page_views: pageViewsRef.current.length,
          pages_visited: pageViewsRef.current,
          session_duration: Math.floor((Date.now() - sessionStartRef.current) / 1000),
        })
        .eq('session_id', sessionIdRef.current);

      if (error) {
        console.error('[Analytics] Page view tracking error:', error);
      } else {
        console.log('[Analytics] Page view tracked successfully');
      }
    } catch (error) {
      console.error('[Analytics] Unexpected error tracking page view:', error);
    }
  };

  const updateSession = async () => {
    if (!sessionIdRef.current || isBot) return;

    const now = Date.now();
    // Throttle updates to once per minute
    if (now - lastUpdateRef.current < 60000) return;

    lastUpdateRef.current = now;

    try {
      await supabase
        .from('visitor_analytics')
        .update({
          last_visit: new Date().toISOString(),
          session_duration: Math.floor((now - sessionStartRef.current) / 1000),
        })
        .eq('session_id', sessionIdRef.current);
    } catch (error) {
      console.error('Session update error:', error);
    }
  };

  return { isBot };
};
