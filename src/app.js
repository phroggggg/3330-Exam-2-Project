import express from "express";
import session from "express-session";
import { randomBytes } from "node:crypto";
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

const app = express();

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


app.get("/", (req, res) => {
    res.send("AnimeKiroku is running");
});

// error middleware
app.use(notFound);
app.use(errorHandler);

export default app;