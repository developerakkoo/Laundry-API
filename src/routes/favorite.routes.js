const router = require("express").Router();
const {
    addFavorite,
    removeFavorite,
    getFavorites,
} = require("../controllers/favorite.controller");

router.post("/add", addFavorite);

router.delete("/remove", removeFavorite);

router.get("/get", getFavorites);

module.exports = { favoriteRoutes: router };
