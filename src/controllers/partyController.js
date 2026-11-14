import partyServices from "../services/partyService.js";

const showParties = (req, res, next) => {
    try {
        res.render("parties", {
            title: "Watch Parties",
            parties: partyServices.listParties({ viewerId: req.session.user?.id ?? null }),
        });
    } catch (error) {
        next(error);
    }
};

const joinParty = (req, res, next) => {
    try {
        partyServices.joinParty(req.session.user.id, req.params.id);
        req.session.flash = { type: "success", message: "You're in! See you there." };
        res.redirect("/parties");
    } catch (error) {
        next(error);
    }
};

const leaveParty = (req, res, next) => {
    try {
        partyServices.leaveParty(req.session.user.id, req.params.id);
        req.session.flash = { type: "success", message: "You left the watch party." };
        res.redirect("/parties");
    } catch (error) {
        next(error);
    }
};

// admin: POST /parties creates a party hosted by the logged-in admin
const createParty = (req, res, next) => {
    try {
        const party = partyServices.createParty({ ...req.body, hostUserId: req.session.user.id });
        req.session.flash = { type: "success", message: `Created "${party.title}".` };
        res.redirect("/admin");
    } catch (error) {
        next(error);
    }
};

const cancelParty = (req, res, next) => {
    try {
        const party = partyServices.cancelParty(req.params.id);
        req.session.flash = { type: "success", message: `Cancelled "${party.title}".` };
        res.redirect("/admin");
    } catch (error) {
        next(error);
    }
};

export default {
    showParties,
    joinParty,
    leaveParty,
    createParty,
    cancelParty,
};