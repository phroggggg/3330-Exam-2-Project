import bcrypt from "bcrypt";

// Data layer: the five object types, the in-memory store that holds them,
// and demo seed data.

// Errors
// Services throw this when a business rule fails; the error middleware reads `status`.
export const createError = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

// Object types
// Represents a registered user of AnimeKiroku.
export class User {
    constructor({ id, username, email, passwordHash, role = "user", createdAt = new Date() }) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role; // 'user' | 'admin'
        this.createdAt = createdAt;
    }

    isAdmin() {
        return this.role === "admin";
    }

    // Safe representation: never expose the password hash to views or sessions.
    toPublic() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            role: this.role,
            createdAt: this.createdAt,
        };
    }
}

// Represents a title in the anime catalog.
export class Anime {
    constructor({ id, title, genre, totalEpisodes, synopsis, year = null }) {
        this.id = id;
        this.title = title;
        this.genre = genre;
        this.totalEpisodes = totalEpisodes;
        this.synopsis = synopsis;
        this.year = year;
    }
}

export const WATCH_STATUSES = ["Plan to Watch", "Currently Watching", "Completed"];

// Links a user to an anime with a viewing status and episode progress.
export class WatchlistEntry {
    constructor({ id, userId, animeId, status = "Plan to Watch", episodesWatched = 0 }) {
        this.id = id;
        this.userId = userId;
        this.animeId = animeId;
        this.status = status;
        this.episodesWatched = episodesWatched;
    }

    /**
     * Update progress while keeping status consistent with it:
     * finishing the last episode completes the entry, and starting
     * a "Plan to Watch" entry moves it to "Currently Watching".
     */
    setProgress(episodes, totalEpisodes) {
        this.episodesWatched = episodes;
        if (totalEpisodes && episodes >= totalEpisodes) {
            this.status = "Completed";
        } else if (episodes > 0 && this.status === "Plan to Watch") {
            this.status = "Currently Watching";
        } else if (episodes < (totalEpisodes || Infinity) && this.status === "Completed") {
            this.status = "Currently Watching";
        }
    }
}

// Records a user's rating (1-10) and opinion of an anime.
export class Review {
    constructor({ id, userId, animeId, rating, comment = "", date = new Date() }) {
        this.id = id;
        this.userId = userId;
        this.animeId = animeId;
        this.rating = rating;
        this.comment = comment;
        this.date = date;
    }
}

// A scheduled group viewing with a capacity limit.
export class WatchParty {
    constructor({ id, animeId, hostUserId, dateTime, maxAttendees, title = "", attendeeIds = [] }) {
        this.id = id;
        this.animeId = animeId;
        this.hostUserId = hostUserId;
        this.dateTime = new Date(dateTime);
        this.maxAttendees = maxAttendees;
        this.title = title;
        this.attendeeIds = [...attendeeIds];
    }

    get spotsLeft() {
        return this.maxAttendees - this.attendeeIds.length;
    }

    isFull() {
        return this.attendeeIds.length >= this.maxAttendees;
    }

    isUpcoming(now = new Date()) {
        return this.dateTime.getTime() > now.getTime();
    }

    hasAttendee(userId) {
        return this.attendeeIds.includes(userId);
    }
}

const SALT_ROUNDS = 10;

/**
 * In-memory "database": one collection per object type plus id counters.
 * The app has no DB connection, so all object instances live here.
 * Services are the only layer that touches the store.
 */
export const store = {
    users: [],
    anime: [],
    watchlist: [],
    reviews: [],
    parties: [],
    _ids: { users: 0, anime: 0, watchlist: 0, reviews: 0, parties: 0 },
};

export function nextId(collection) {
    store._ids[collection] += 1;
    return store._ids[collection];
}

export function resetStore() {
    for (const key of ["users", "anime", "watchlist", "reviews", "parties"]) {
        store[key] = [];
        store._ids[key] = 0;
    }
}

// DB

const CATALOG = [
    [
        "Cowboy Bebop",
        "Sci-Fi",
        26,
        1998,
        "A crew of bounty hunters drifts through the solar system, chasing paychecks and outrunning their pasts.",
    ],
    [
        "Fullmetal Alchemist: Brotherhood",
        "Adventure",
        64,
        2009,
        "Two brothers search for a way to undo a forbidden alchemical mistake and uncover a national conspiracy.",
    ],
    [
        "Spirited Away",
        "Fantasy",
        1,
        2001,
        "A girl stumbles into a spirit world bathhouse and must work to free her parents and find her way home.",
    ],
    [
        "Attack on Titan",
        "Action",
        87,
        2013,
        "Humanity hides behind enormous walls from giants, until a breach forces a desperate fight for survival.",
    ],
    [
        "Death Note",
        "Thriller",
        37,
        2006,
        "A student finds a notebook that kills anyone whose name is written in it, and a brilliant detective closes in.",
    ],
    [
        "Your Name",
        "Romance",
        1,
        2016,
        "Two teenagers who have never met begin swapping bodies and slowly piece together a larger mystery.",
    ],
    [
        "Steins;Gate",
        "Sci-Fi",
        24,
        2011,
        "A self-styled mad scientist discovers that text messages can be sent to the past, with escalating consequences.",
    ],
    [
        "Haikyu!!",
        "Sports",
        25,
        2014,
        "A short, determined first-year joins a volleyball team and learns what it takes to compete at the top.",
    ],
    [
        "Mob Psycho 100",
        "Comedy",
        12,
        2016,
        "A powerful but modest middle schooler tries to live a normal life while keeping his psychic abilities in check.",
    ],
    [
        "Frieren: Beyond Journey's End",
        "Fantasy",
        28,
        2023,
        "After the hero party defeats the demon king, a long-lived elf mage reflects on time and the friends she left behind.",
    ],
    [
        "Demon Slayer",
        "Action",
        26,
        2019,
        "A kind-hearted boy becomes a demon slayer to cure his sister and avenge his family.",
    ],
    [
        "Violet Evergarden",
        "Drama",
        13,
        2018,
        "A former soldier becomes a letter writer and learns about human emotion one client at a time.",
    ],
];

function addDays(days, hour) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
}

// Populates the store with DB. Safe to call repeatedly (resets first).
export function seed() {
    resetStore();

    const admin = new User({
        id: nextId("users"),
        username: "admin",
        email: "admin@animekiroku.test",
        passwordHash: bcrypt.hashSync("Admin123!", SALT_ROUNDS),
        role: "admin",
    });
    const mia = new User({
        id: nextId("users"),
        username: "mia",
        email: "mia@animekiroku.test",
        passwordHash: bcrypt.hashSync("Password1!", SALT_ROUNDS),
    });
    const leo = new User({
        id: nextId("users"),
        username: "leo",
        email: "leo@animekiroku.test",
        passwordHash: bcrypt.hashSync("Password1!", SALT_ROUNDS),
    });
    store.users.push(admin, mia, leo);

    for (const [title, genre, totalEpisodes, year, synopsis] of CATALOG) {
        store.anime.push(new Anime({ id: nextId("anime"), title, genre, totalEpisodes, year, synopsis }));
    }

    store.watchlist.push(
        new WatchlistEntry({
            id: nextId("watchlist"),
            userId: mia.id,
            animeId: 1,
            status: "Completed",
            episodesWatched: 26,
        }),
        new WatchlistEntry({
            id: nextId("watchlist"),
            userId: mia.id,
            animeId: 7,
            status: "Currently Watching",
            episodesWatched: 9,
        }),
        new WatchlistEntry({
            id: nextId("watchlist"),
            userId: leo.id,
            animeId: 1,
            status: "Currently Watching",
            episodesWatched: 12,
        }),
    );

    store.reviews.push(
        new Review({
            id: nextId("reviews"),
            userId: mia.id,
            animeId: 1,
            rating: 10,
            comment: "Stylish, melancholy, and endlessly rewatchable.",
        }),
        new Review({
            id: nextId("reviews"),
            userId: leo.id,
            animeId: 1,
            rating: 9,
            comment: "The soundtrack alone is worth it.",
        }),
        new Review({
            id: nextId("reviews"),
            userId: mia.id,
            animeId: 3,
            rating: 9,
            comment: "Beautiful and strange in the best way.",
        }),
        new Review({
            id: nextId("reviews"),
            userId: leo.id,
            animeId: 7,
            rating: 10,
            comment: "The slow burn pays off. Do not read spoilers.",
        }),
        new Review({
            id: nextId("reviews"),
            userId: mia.id,
            animeId: 10,
            rating: 8,
            comment: "Quiet, warm and surprisingly moving.",
        }),
    );

    store.parties.push(
        new WatchParty({
            id: nextId("parties"),
            animeId: 1,
            hostUserId: admin.id,
            title: "Bebop Marathon: Sessions 1-6",
            dateTime: addDays(3, 19),
            maxAttendees: 5,
            attendeeIds: [admin.id, mia.id],
        }),
        new WatchParty({
            id: nextId("parties"),
            animeId: 3,
            hostUserId: admin.id,
            title: "Spirited Away Movie Night",
            dateTime: addDays(6, 20),
            maxAttendees: 3,
            attendeeIds: [admin.id, mia.id, leo.id],
        }),
        new WatchParty({
            id: nextId("parties"),
            animeId: 7,
            hostUserId: admin.id,
            title: "Steins;Gate Episode Club",
            dateTime: addDays(9, 18),
            maxAttendees: 8,
            attendeeIds: [admin.id],
        }),
    );
}
