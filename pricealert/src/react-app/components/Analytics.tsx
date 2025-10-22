import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Simple analytics tracking
export function useAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // Track page views
    trackEvent('page_view', {
      path: location.pathname,
      timestamp: new Date().toISOString(),
    });
  }, [location.pathname]);

  const trackEvent = async (eventName: string, eventData: any = {}) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          eventName,
          eventData: {
            ...eventData,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
      console.debug('Analytics error:', error);
    }
  };

  return { trackEvent };
}

// Analytics component that auto-tracks page views
export default function Analytics() {
  useAnalytics();
  return null; // This component doesn't render anything
}
