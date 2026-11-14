import animeServices from "../services/animeService.js";
import partyServices from "../services/partyService.js";
import watchlistServices from "../services/watchlistService.js";

const { WATCH_STATUSES } = watchlistServices;

// only allow redirects to local paths (prevents open-redirect abuse)
const safeRedirect = (target, fallback) =>
    typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : fallback;

// home + catalog

const showHome = (req, res, next) => {
    try {
        res.render("home", {
            title: "Track. Rate. Watch together.",
            topRated: animeServices.getTopRated(4),
            stats: animeServices.getCatalogStats(),
            upcomingParties: partyServices.getUpcoming(3),
        });
    } catch (error) {
        next(error);
    }
};

// /catalog shows the grid; /catalog?anime=ID shows one title (details, reviews, watchlist)
const showCatalog = (req, res, next) => {
    try {
        const user = req.session.user;
        let selected = null;
        if (req.query.anime) {
            const anime = animeServices.getAnimeById(req.query.anime);
            selected = {
                anime,
                reviews: animeServices.getReviewsForAnime(anime.id),
                myReview: user ? animeServices.findUserReview(user.id, anime.id) : null,
                myEntry: user ? watchlistServices.findEntryForAnime(user.id, anime.id) : null,
            };
        }
        const q = String(req.query.q || "").slice(0, 100);
        const genre = String(req.query.genre || "");
        const sort = req.query.sort === "rating" ? "rating" : "title";

        res.render("catalog", {
            title: selected ? selected.anime.title : "Catalog",
            selected,
            statuses: WATCH_STATUSES,
            animeList: selected ? [] : animeServices.listAnime({ q, genre, sort }),
            genres: animeServices.getGenres(),
            filters: { q, genre, sort },
        });
    } catch (error) {
        next(error);
    }
};

// ---------- reviews ----------

const saveReview = (req, res, next) => {
    try {
        const animeId = Number(req.params.id);
        const { updated } = animeServices.submitReview(req.session.user.id, animeId, req.body.rating, req.body.comment);
        req.session.flash = {
            type: "success",
            message: updated ? "Your review was updated." : "Thanks for reviewing!",
        };
        res.redirect(`/catalog?anime=${animeId}#reviews`);
    } catch (error) {
        next(error);
    }
};

const removeReview = (req, res, next) => {
    try {
        const animeId = Number(req.params.id);
        animeServices.deleteReview(req.session.user.id, animeId);
        req.session.flash = { type: "success", message: "Your review was deleted." };
        res.redirect(`/catalog?anime=${animeId}#reviews`);
    } catch (error) {
        next(error);
    }
};

// ---------- watchlist ----------

const showWatchlist = (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const status = WATCH_STATUSES.includes(req.query.status) ? req.query.status : "";
        res.render("watchlist", {
            title: "My Watchlist",
            entries: watchlistServices.getWatchlist(userId, status),
            counts: watchlistServices.getStatusCounts(userId),
            statuses: WATCH_STATUSES,
            activeStatus: status,
            addable: watchlistServices.getAddableAnime(userId),
        });
    } catch (error) {
        next(error);
    }
};

const addEntry = (req, res, next) => {
    try {
        const entry = watchlistServices.addToWatchlist(
            req.session.user.id,
            req.body.animeId,
            req.body.status || "Plan to Watch"
        );
        req.session.flash = { type: "success", message: `Added "${entry.anime.title}" to your watchlist.` };
        res.redirect(safeRedirect(req.body.next, "/watchlist"));
    } catch (error) {
        next(error);
    }
};

const updateEntry = (req, res, next) => {
    try {
        const entry = watchlistServices.updateEntry(req.session.user.id, req.params.id, req.body);
        req.session.flash = { type: "success", message: `Updated "${entry.anime.title}".` };
        res.redirect(safeRedirect(req.body.next, "/watchlist"));
    } catch (error) {
        next(error);
    }
};

const removeEntry = (req, res, next) => {
    try {
        watchlistServices.removeEntry(req.session.user.id, req.params.id);
        req.session.flash = { type: "success", message: "Removed from your watchlist." };
        res.redirect(safeRedirect(req.body.next, "/watchlist"));
    } catch (error) {
        next(error);
    }
};

export default {
    showHome,
    showCatalog,
    saveReview,
    removeReview,
    showWatchlist,
    addEntry,
    updateEntry,
    removeEntry,
};