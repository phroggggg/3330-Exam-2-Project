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

export default {
    showParties,
    joinParty,
    leaveParty,
};