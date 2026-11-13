import userServices from "../services/userService.js";

// session.regenerate / destroy use callbacks, so wrap them in promises
const regenerate = (req) =>
    new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
const destroy = (req) =>
    new Promise((resolve, reject) => req.session.destroy((err) => (err ? reject(err) : resolve())));

const showLogin = (req, res) => {
    res.render("auth", { title: "Log in", mode: "login", errors: {}, values: {}, formError: null });
};

const showRegister = (req, res) => {
    res.render("auth", { title: "Sign up", mode: "register", errors: {}, values: {}, formError: null });
};

const register = async (req, res, next) => {
    try {
        const user = await userServices.registerUser(req.body);
        await regenerate(req); // new session id when privileges change (prevents fixation)
        req.session.user = user.toPublic();
        req.session.flash = { type: "success", message: `Welcome to AnimeKiroku, ${user.username}!` };
        res.redirect("/catalog");
    } catch (error) {
        // validation problems are shown next to the fields of the form
        if (error.fieldErrors) {
            const { username, email } = req.body;
            return res.status(error.status).render("auth", {
                title: "Sign up",
                mode: "register",
                errors: error.fieldErrors,
                values: { username, email },
                formError: error.message,
            });
        }
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const user = await userServices.authenticate(req.body.email, req.body.password);
        const returnTo = req.session.returnTo;
        await regenerate(req);
        req.session.user = user.toPublic();
        req.session.flash = { type: "success", message: `Welcome back, ${user.username}.` };
        // only follow same-site relative paths
        res.redirect(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/watchlist");
    } catch (error) {
        if (error.status === 401) {
            return res.status(401).render("auth", {
                title: "Log in",
                mode: "login",
                errors: {},
                values: { email: req.body.email },
                formError: error.message,
            });
        }
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        await destroy(req);
        res.clearCookie("kiroku.sid");
        res.redirect("/");
    } catch (error) {
        next(error);
    }
};

export default {
    showLogin,
    showRegister,
    register,
    login,
    logout,
};