import landingHTML from './landing.html';
import privacyHTML from './privacy.html';

const APK_URL = 'https://github.com/jadjbara10/droob/releases/download/v6.5.0/droob.apk';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const path = url.pathname;

    // Redirect www.droob-jo.com -> droob-jo.com
    if (hostname === 'www.droob-jo.com') {
      return Response.redirect(`https://droob-jo.com${path}`, 301);
    }

    // Privacy policy page
    if (path === '/privacy' || path === '/privacy/') {
      return new Response(privacyHTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // APK direct download - redirect to GitHub release asset
    // GitHub returns 302 to CDN with Content-Disposition: attachment
    // This ensures browser downloads the file directly without opening a new tab
    if (path === '/download' || path === '/download/') {
      return Response.redirect(APK_URL, 302);
    }

    // Landing page (default)
    return new Response(landingHTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};