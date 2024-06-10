const router = require("express").Router();
const userController = require("../controllers/user.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const categoryController = require("../controllers/category.controller");

router.post("/register", userController.registerUser);

router.post("/login", userController.login);

/* Authorize access only */
router.use(isAuthenticated);

router.get("/logout", userController.logout);

router.put("/update-profile", userController.updateUser);

router.get("/get-current-user", userController.getCurrentUser);

/* Category routes for users */

router.get("/get-category/:id", categoryController.getCategoryById);

router.get("/get-categories", categoryController.getAllCategory);

module.exports = { userRoutes: router };
