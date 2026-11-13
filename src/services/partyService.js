import { store, nextId, createError, WatchParty } from "./data.js";

const describe = (party, viewerId = null) => {
    const anime = store.anime.find((item) => item.id === party.animeId);
    const host = store.users.find((user) => user.id === party.hostUserId);
    const attendees = party.attendeeIds
        .map((id) => store.users.find((user) => user.id === id)?.username)
        .filter(Boolean);
    return {
        ...party,
        spotsLeft: party.spotsLeft,
        isFull: party.isFull(),
        isUpcoming: party.isUpcoming(),
        anime,
        hostName: host ? host.username : "unknown",
        attendees,
        joined: viewerId !== null && party.hasAttendee(viewerId),
        isHost: viewerId !== null && party.hostUserId === viewerId,
    };
};

const findParty = (id) => {
    const party = store.parties.find((item) => item.id === Number(id));
    if (!party) throw createError("That watch party does not exist.", 404);
    return party;
};

// soonest first; past parties are hidden unless includePast is set
const listParties = ({ viewerId = null, includePast = false } = {}) =>
    store.parties
        .filter((party) => includePast || party.isUpcoming())
        .sort((a, b) => a.dateTime - b.dateTime)
        .map((party) => describe(party, viewerId));

const getUpcoming = (limit = 3) => listParties().slice(0, limit);

// business rule: join an upcoming party only once, and only while spots are left
const joinParty = (userId, partyId) => {
    const party = findParty(partyId);
    if (!party.isUpcoming()) throw createError("This watch party has already happened.");
    if (party.hasAttendee(userId)) throw createError("You have already joined this watch party.", 409);
    if (party.isFull()) throw createError("Sorry, this watch party is full.", 409);
    party.attendeeIds.push(userId);
    return describe(party, userId);
};

const leaveParty = (userId, partyId) => {
    const party = findParty(partyId);
    if (!party.hasAttendee(userId)) throw createError("You are not signed up for this watch party.");
    if (party.hostUserId === userId) throw createError("Hosts cannot leave their own watch party.");
    party.attendeeIds = party.attendeeIds.filter((id) => id !== userId);
    return describe(party, userId);
};

// admin: schedule a party; the host is automatically the first attendee
const createParty = ({ animeId, hostUserId, title, dateTime, maxAttendees }) => {
    const anime = store.anime.find((item) => item.id === Number(animeId));
    if (!anime) throw createError("Choose an anime for the watch party.");

    const when = new Date(dateTime);
    if (!dateTime || Number.isNaN(when.getTime())) throw createError("Enter a valid date and time.");
    if (when.getTime() <= Date.now()) throw createError("Watch parties must be scheduled in the future.");

    const max = Number(maxAttendees);
    if (!Number.isInteger(max) || max < 2 || max > 100) {
        throw createError("Capacity must be a whole number between 2 and 100.");
    }
    const cleanTitle = String(title || "").trim() || `${anime.title} Watch Party`;
    if (cleanTitle.length > 80) throw createError("Titles are limited to 80 characters.");

    const newParty = new WatchParty({
        id: nextId("parties"),
        animeId: anime.id,
        hostUserId,
        title: cleanTitle,
        dateTime: when,
        maxAttendees: max,
        attendeeIds: [hostUserId],
    });
    store.parties.push(newParty);
    return describe(newParty, hostUserId);
};

const cancelParty = (partyId) => {
    const party = findParty(partyId);
    store.parties.splice(store.parties.indexOf(party), 1);
    return party;
};

export default {
    listParties,
    getUpcoming,
    joinParty,
    leaveParty,
    createParty,
    cancelParty,
};
