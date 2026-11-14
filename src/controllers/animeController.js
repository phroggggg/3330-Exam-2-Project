import animeServices from "../services/animeService.js";
import partyServices from "../services/partyService.js";
import watchlistServices from "../services/watchlistService.js";

const { WATCH_STATUSES } = watchlistServices;

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

export default {
    showHome,
    showCatalog,
};