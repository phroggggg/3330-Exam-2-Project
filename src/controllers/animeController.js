import animeServices from "../services/animeService.js";
import partyServices from "../services/partyService.js";

// home 

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

export default {
    showHome,
};