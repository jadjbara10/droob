/**
 * دروب Droob — Landing Page + Privacy Policy Worker
 * Serves:
 *   / → landing page
 *   /privacy → privacy policy (Arabic + English)
 */
import landingHTML from './landing.html';
import privacyHTML from './privacy.html';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/privacy' || path === '/privacy/') {
      return new Response(privacyHTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Default: landing page
    return new Response(landingHTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
