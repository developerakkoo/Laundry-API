const router = require("express").Router();
const {
    addToCart,
    removeFromCart,
    getCart,
    clearCart,
} = require("../controllers/cart.controller");
const {isAuthenticated} = require("../middlewares/auth.middleware");

/* Authorize access only */
router.use(isAuthenticated);

// Add item to cart
router.post("/add", addToCart);

// Remove item from cart
router.post("/remove", removeFromCart);

// Get cart items
router.get("/:userId", getCart);

// Clear cart
router.post("/clear/:userId", clearCart);

module.exports = { CartRoutes: router };
