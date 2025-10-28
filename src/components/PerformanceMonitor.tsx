import { useEffect } from "react";

export const PerformanceMonitor = () => {
  useEffect(() => {
    // Report Web Vitals when available
    if (typeof window !== 'undefined' && 'performance' in window) {
      const reportWebVitals = () => {
        // Log performance metrics in development
        if (import.meta.env.DEV) {
          const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (perfEntries) {
            console.log('Performance Metrics:', {
              loadTime: perfEntries.loadEventEnd - perfEntries.fetchStart,
              domContentLoaded: perfEntries.domContentLoadedEventEnd - perfEntries.fetchStart,
              firstByte: perfEntries.responseStart - perfEntries.requestStart,
            });
          }
        }
      };

      if (document.readyState === 'complete') {
        reportWebVitals();
      } else {
        window.addEventListener('load', reportWebVitals);
        return () => window.removeEventListener('load', reportWebVitals);
      }
    }
  }, []);

  return null;
};
