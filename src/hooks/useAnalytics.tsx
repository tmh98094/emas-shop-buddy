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
    if (!sessionIdRef.current) return;

    try {
      const { data: existingSession } = await supabase
        .from('visitor_analytics')
        .select('*')
        .eq('session_id', sessionIdRef.current)
        .single();

      if (!existingSession) {
        // Create new session
        const params = new URLSearchParams(window.location.search);
        
        await supabase.from('visitor_analytics').insert({
          session_id: sessionIdRef.current,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          first_visit: new Date().toISOString(),
          last_visit: new Date().toISOString(),
          page_views: 1,
          pages_visited: [location.pathname],
          referrer: document.referrer || null,
          utm_source: params.get('utm_source'),
          utm_medium: params.get('utm_medium'),
          utm_campaign: params.get('utm_campaign'),
          device_type: getDeviceType(),
          browser: getBrowserName(),
          is_bot: false,
          session_duration: 0,
        });

        pageViewsRef.current = [location.pathname];
      } else {
        pageViewsRef.current = Array.isArray(existingSession.pages_visited) 
          ? (existingSession.pages_visited as string[])
          : [];
      }
    } catch (error) {
      console.error('Analytics initialization error:', error);
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
      await supabase
        .from('visitor_analytics')
        .update({
          last_visit: new Date().toISOString(),
          page_views: pageViewsRef.current.length,
          pages_visited: pageViewsRef.current,
          session_duration: Math.floor((Date.now() - sessionStartRef.current) / 1000),
        })
        .eq('session_id', sessionIdRef.current);
    } catch (error) {
      console.error('Page view tracking error:', error);
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
