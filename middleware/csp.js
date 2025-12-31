/**
 * Content Security Policy (CSP) Middleware
 * Implements strict XSS protection with whitelisting approach
 */

const cspMiddleware = (req, res, next) => {
    // Strict CSP Policy
    // - default-src 'self': Block everything by default, allow only same origin
    // - script-src 'self': Only allow scripts from same origin
    // - style-src 'self': Only allow styles from same origin
    // - img-src 'self' data: https:: Allow self, data URIs, and HTTPS images
    // - font-src 'self' https://fonts.google.com: Allow self and Google Fonts
    // - connect-src 'self': Only allow API calls to same origin
    // - frame-ancestors 'none': Prevent clickjacking, disallow iframe embedding
    // - form-action 'self': Only allow form submissions to same origin
    // - base-uri 'self': Only allow base URL from same origin
    // - object-src 'none': Block plugins completely
    // - upgrade-insecure-requests: Upgrade HTTP to HTTPS automatically
    // - block-all-mixed-content: Block mixed HTTP/HTTPS content

    const cspPolicy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "upgrade-insecure-requests",
        "block-all-mixed-content"
    ].join('; ');

    // Set CSP header
    res.setHeader('Content-Security-Policy', cspPolicy);

    // Also set report-only for monitoring (optional, helps catch violations)
    // res.setHeader('Content-Security-Policy-Report-Only', cspPolicy);

    // Additional Security Headers
    
    // Prevent browsers from MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS Protection in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Disable CORS for cross-origin requests
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Referrer Policy - Don't leak referrer to cross-origin sites
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature Policy) - Restrict browser features
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

    next();
};

module.exports = cspMiddleware;
