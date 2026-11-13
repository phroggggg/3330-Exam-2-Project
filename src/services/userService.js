import bcrypt from "bcrypt";
import { store, nextId, createError, User } from "./data.js";

const SALT_ROUNDS = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

const validateRegistration = ({ username, email, password, confirmPassword }) => {
    const errors = {};
    if (!USERNAME_RE.test(username || "")) errors.username = "Use 3-20 letters, numbers or underscores.";
    if (!EMAIL_RE.test(email || "")) errors.email = "Enter a valid email address.";
    if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        errors.password = "Use at least 8 characters, including a letter and a number.";
    }
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    return errors;
};

const findByEmail = (email) => {
    const needle = String(email || "").trim().toLowerCase();
    return store.users.find((user) => user.email.toLowerCase() === needle) || null;
};

// business rule: usernames and emails are unique; the password is stored hashed
const registerUser = async (input) => {
    const username = String(input.username || "").trim();
    const email = String(input.email || "").trim().toLowerCase();

    const errors = validateRegistration({ ...input, username, email });
    if (Object.keys(errors).length) {
        const error = createError("Please fix the highlighted fields.", 400);
        error.fieldErrors = errors;
        throw error;
    }
    if (findByEmail(email)) {
        const error = createError("An account with that email already exists.", 409);
        error.fieldErrors = { email: "Email is already registered." };
        throw error;
    }
    if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        const error = createError("That username is taken.", 409);
        error.fieldErrors = { username: "Username is taken." };
        throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const newUser = new User({ id: nextId("users"), username, email, passwordHash, role: "user" });
    store.users.push(newUser);
    return newUser;
};

// returns the User on success; the error is deliberately vague on failure
const authenticate = async (email, password) => {
    const user = findByEmail(email);
    const ok = user ? await bcrypt.compare(String(password || ""), user.passwordHash) : false;
    if (!user || !ok) throw createError("Incorrect email or password.", 401);
    return user;
};

// admin view: every registered user (public fields only) with their activity counts
const listUsersWithActivity = () =>
    store.users.map((user) => ({
        ...user.toPublic(),
        watchlistCount: store.watchlist.filter((entry) => entry.userId === user.id).length,
        reviewCount: store.reviews.filter((review) => review.userId === user.id).length,
    }));

export default {
    validateRegistration,
    findByEmail,
    registerUser,
    authenticate,
    listUsersWithActivity,
};
