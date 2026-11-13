import { store, nextId, createError, Anime, Review } from "./data.js";

// catalog 

const getRatingSummary = (animeId) => {
    const reviews = store.reviews.filter((review) => review.animeId === animeId);
    if (reviews.length === 0) return { average: null, count: 0 };
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return { average: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
};

const withRating = (anime) => {
    const { average, count } = getRatingSummary(anime.id);
    return { ...anime, averageRating: average, reviewCount: count };
};

const getGenres = () => [...new Set(store.anime.map((anime) => anime.genre))].sort();

// search the catalog by title/synopsis text and/or genre
const listAnime = ({ q = "", genre = "", sort = "title" } = {}) => {
    const needle = String(q).trim().toLowerCase();
    const results = store.anime
        .filter((anime) => {
            const matchesText =
                !needle || anime.title.toLowerCase().includes(needle) || anime.synopsis.toLowerCase().includes(needle);
            return matchesText && (!genre || anime.genre === genre);
        })
        .map(withRating);

    if (sort === "rating") {
        results.sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1));
    } else {
        results.sort((a, b) => a.title.localeCompare(b.title));
    }
    return results;
};

const getAnimeById = (id) => {
    const anime = store.anime.find((item) => item.id === Number(id));
    if (!anime) throw createError("That anime is not in the catalog.", 404);
    return withRating(anime);
};

const getTopRated = (limit = 4) =>
    store.anime
        .map(withRating)
        .filter((anime) => anime.averageRating !== null)
        .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
        .slice(0, limit);

const getCatalogStats = () => ({
    titles: store.anime.length,
    reviews: store.reviews.length,
    members: store.users.length,
});

// admin: add a new title to the catalog (duplicate titles are rejected)
const addAnime = ({ title, genre, totalEpisodes, year, synopsis }) => {
    title = String(title || "").trim();
    genre = String(genre || "").trim();
    synopsis = String(synopsis || "").trim();
    const episodes = Number(totalEpisodes);
    const releaseYear = year ? Number(year) : null;

    if (!title || !genre || !synopsis) {
        throw createError("Title, genre and synopsis are required.");
    }
    if (!Number.isInteger(episodes) || episodes < 1 || episodes > 3000) {
        throw createError("Total episodes must be a whole number between 1 and 3000.");
    }
    if (
        releaseYear !== null &&
        (!Number.isInteger(releaseYear) || releaseYear < 1917 || releaseYear > new Date().getFullYear() + 2)
    ) {
        throw createError("Please enter a valid release year.");
    }
    if (store.anime.some((anime) => anime.title.toLowerCase() === title.toLowerCase())) {
        throw createError(`"${title}" is already in the catalog.`, 409);
    }

    const newAnime = new Anime({
        id: nextId("anime"),
        title,
        genre,
        totalEpisodes: episodes,
        year: releaseYear,
        synopsis,
    });
    store.anime.push(newAnime);
    return newAnime;
};

// ---------- reviews and ratings ----------

// reviews for an anime, newest first, with the author's username attached
const getReviewsForAnime = (animeId) =>
    store.reviews
        .filter((review) => review.animeId === animeId)
        .sort((a, b) => b.date - a.date)
        .map((review) => ({
            ...review,
            username: store.users.find((user) => user.id === review.userId)?.username ?? "unknown",
        }));

const findUserReview = (userId, animeId) =>
    store.reviews.find((review) => review.userId === userId && review.animeId === animeId) || null;

// business rule: one review per user per anime; submitting again edits the existing review
const submitReview = (userId, animeId, rawRating, rawComment = "") => {
    const anime = store.anime.find((item) => item.id === animeId);
    if (!anime) throw createError("That anime does not exist.", 404);

    const rating = Number(rawRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        throw createError("Rating must be a whole number from 1 to 10.");
    }
    const comment = String(rawComment || "").trim();
    if (comment.length > 500) throw createError("Reviews are limited to 500 characters.");

    const existing = findUserReview(userId, animeId);
    if (existing) {
        existing.rating = rating;
        existing.comment = comment;
        existing.date = new Date();
        return { review: existing, updated: true };
    }
    const review = new Review({ id: nextId("reviews"), userId, animeId, rating, comment });
    store.reviews.push(review);
    return { review, updated: false };
};

const deleteReview = (userId, animeId) => {
    const index = store.reviews.findIndex((review) => review.userId === userId && review.animeId === animeId);
    if (index === -1) throw createError("You have not reviewed this anime.", 404);
    store.reviews.splice(index, 1);
};

export default {
    getGenres,
    listAnime,
    getAnimeById,
    getTopRated,
    getCatalogStats,
    addAnime,
    getRatingSummary,
    getReviewsForAnime,
    findUserReview,
    submitReview,
    deleteReview,
};
