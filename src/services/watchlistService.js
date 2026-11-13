import { store, nextId, createError, WatchlistEntry, WATCH_STATUSES } from "./data.js";

const describe = (entry) => {
    const anime = store.anime.find((item) => item.id === entry.animeId);
    const percent = anime && anime.totalEpisodes ? Math.round((entry.episodesWatched / anime.totalEpisodes) * 100) : 0;
    return { ...entry, anime, percent };
};

// same error whether the entry doesn't exist or belongs to someone else (no information leak)
const findOwned = (userId, entryId) => {
    const entry = store.watchlist.find((item) => item.id === Number(entryId) && item.userId === userId);
    if (!entry) throw createError("That watchlist entry was not found.", 404);
    return entry;
};

const assertStatus = (status) => {
    if (!WATCH_STATUSES.includes(status)) throw createError("Choose a valid watch status.");
};

const getWatchlist = (userId, status = "") =>
    store.watchlist
        .filter((entry) => entry.userId === userId && (!status || entry.status === status))
        .map(describe)
        .sort((a, b) => a.anime.title.localeCompare(b.anime.title));

const getStatusCounts = (userId) => {
    const mine = store.watchlist.filter((entry) => entry.userId === userId);
    const counts = { All: mine.length };
    for (const status of WATCH_STATUSES) {
        counts[status] = mine.filter((entry) => entry.status === status).length;
    }
    return counts;
};

const findEntryForAnime = (userId, animeId) =>
    store.watchlist.find((entry) => entry.userId === userId && entry.animeId === Number(animeId)) || null;

// anime the user has not added yet (feeds the "add a title" form)
const getAddableAnime = (userId) => {
    const taken = new Set(store.watchlist.filter((entry) => entry.userId === userId).map((entry) => entry.animeId));
    return store.anime.filter((anime) => !taken.has(anime.id)).sort((a, b) => a.title.localeCompare(b.title));
};

// business rule: a user can have each anime on their list only once
const addToWatchlist = (userId, animeId, status = "Plan to Watch") => {
    const anime = store.anime.find((item) => item.id === Number(animeId));
    if (!anime) throw createError("That anime does not exist.", 404);
    assertStatus(status);
    if (findEntryForAnime(userId, anime.id)) {
        throw createError(`"${anime.title}" is already on your watchlist.`, 409);
    }

    const newEntry = new WatchlistEntry({ id: nextId("watchlist"), userId, animeId: anime.id, status });
    if (status === "Completed") newEntry.episodesWatched = anime.totalEpisodes;
    store.watchlist.push(newEntry);
    return describe(newEntry);
};

// update status and/or episode progress
// - changing the status wins: Completed fills progress, Plan to Watch resets it
// - otherwise the episode count drives the status (see WatchlistEntry.setProgress)
const updateEntry = (userId, entryId, { status, episodesWatched }) => {
    const entry = findOwned(userId, entryId);
    const total = store.anime.find((item) => item.id === entry.animeId).totalEpisodes;

    let episodes = entry.episodesWatched;
    if (episodesWatched !== undefined && episodesWatched !== "") {
        episodes = Number(episodesWatched);
        if (!Number.isInteger(episodes) || episodes < 0 || episodes > total) {
            throw createError(`Episodes watched must be a whole number from 0 to ${total}.`);
        }
    }

    if (status && status !== entry.status) {
        assertStatus(status);
        entry.status = status;
        if (status === "Completed") entry.episodesWatched = total;
        else if (status === "Plan to Watch") entry.episodesWatched = 0;
        else entry.episodesWatched = Math.min(episodes, Math.max(total - 1, 0));
    } else {
        entry.setProgress(episodes, total);
    }
    return describe(entry);
};

const removeEntry = (userId, entryId) => {
    const entry = findOwned(userId, entryId);
    store.watchlist.splice(store.watchlist.indexOf(entry), 1);
};

export default {
    WATCH_STATUSES,
    getWatchlist,
    getStatusCounts,
    findEntryForAnime,
    getAddableAnime,
    addToWatchlist,
    updateEntry,
    removeEntry,
};
