import express from "express";
import session from "express-session";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import animeRouter from "./routes/animeRoutes.js";
import authRouter from "./routes/authRoutes.js";
import {
    securityHeaders,
    requestLogger,
    csrfToken,
    csrfProtection,
    attachUser,
    flash,
    notFound,
    errorHandler,
} from "./middleware/middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// views (dynamic content) and public (static front end) are kept apart
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.static(path.join(__dirname, "..", "public")));

// request processing + security middleware
app.use(securityHeaders);
app.use(requestLogger);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
    session({
        name: "kiroku.sid",
        secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 8 },
    })
);
app.use(csrfToken);
app.use(csrfProtection);
app.use(attachUser);
app.use(flash);

// map requests to the routers
app.use("/", animeRouter);
app.use("/", authRouter);

// error middleware
app.use(notFound);
app.use(errorHandler);

export default app;