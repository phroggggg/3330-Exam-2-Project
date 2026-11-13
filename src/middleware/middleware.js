import { randomBytes, timingSafeEqual } from "node:crypto";

// All middleware for the app lives in this file.

// ---------- security ----------

// Security headers. The CSP only allows same-origin assets, so views must not
// use inline <script> tags or style="" attributes.
export const securityHeaders = (req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
            "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    res.removeHeader("X-Powered-By");
    next();
};

// Give every session a CSRF token and expose it to the views as csrfToken.
export const csrfToken = (req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = randomBytes(24).toString("hex");
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
};

// Reject POST/PATCH/DELETE requests that do not carry the session's CSRF token.
export const csrfProtection = (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

    const sent = String((req.body && req.body._csrf) || req.get("x-csrf-token") || "");
    const expected = String(req.session.csrfToken || "");
    const valid =
        sent.length > 0 &&
        sent.length === expected.length &&
        timingSafeEqual(Buffer.from(sent), Buffer.from(expected));

    if (!valid) {
        const error = new Error("Your session expired or the form was invalid. Please go back and try again.");
        error.status = 403;
        return next(error);
    }
    next();
};

// Small in-memory rate limiter (per IP) to slow down password guessing on login/register.
export const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20 } = {}) => {
    const hits = new Map();
    return (req, res, next) => {
        const now = Date.now();
        const recent = (hits.get(req.ip) || []).filter((time) => now - time < windowMs);
        recent.push(now);
        hits.set(req.ip, recent);
        if (recent.length > max) {
            const error = new Error("Too many attempts. Please wait a few minutes and try again.");
            error.status = 429;
            return next(error);
        }
        next();
    };
};

// authentication / authorization

// Expose the logged-in user (public fields only) to every view.
export const attachUser = (req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.currentPath = req.path;
    next();
};

export const requireAuth = (req, res, next) => {
    if (req.session.user) return next();
    req.session.flash = { type: "error", message: "Please log in to continue." };
    req.session.returnTo = req.method === "GET" ? req.originalUrl : "/";
    res.redirect("/login");
};

export const requireAdmin = (req, res, next) => {
    if (!req.session.user) {
        req.session.flash = { type: "error", message: "Please log in to continue." };
        return res.redirect("/login");
    }
    if (req.session.user.role !== "admin") {
        const error = new Error("You need administrator access to view this page.");
        error.status = 403;
        return next(error);
    }
    next();
};

// Keep logged-in users away from the login/register forms.
export const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user) return res.redirect("/watchlist");
    next();
};

// request helpers 

// One-time messages that survive a redirect (Post/Redirect/Get).
export const flash = (req, res, next) => {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
};

export const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
};

// error handling 

export const notFound = (req, res, next) => {
    const error = new Error(`We couldn't find "${req.originalUrl}".`);
    error.status = 404;
    next(error);
};

// the page the user came from (same site only), used to show form errors where they happened
const previousPage = (req) => {
    try {
        const referer = new URL(req.get("referer"));
        return referer.host === req.get("host") ? referer.pathname + referer.search : "/";
    } catch {
        return "/";
    }
};

// error middleware must be loaded last
export const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    const message = status < 500 ? err.message : "Something went wrong on our side. Please try again.";

    if (res.headersSent) return next(err);

    // fetch() calls to /api/... get JSON
    if (req.originalUrl.startsWith("/api/")) {
        return res.status(status).json({ success: false, message });
    }
    // if the home page itself fails, answer with plain text so we never redirect in a loop
    if (req.method === "GET" && req.path === "/") {
        return res.status(status).type("text").send(message);
    }
    // everything else: show the message in the flash banner (form posts return to the form's page)
    req.session.flash = { type: "error", message };
    res.redirect(req.method === "GET" ? "/" : previousPage(req));
};
