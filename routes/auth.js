const express = require("express");
const {
  register,
  login,
  getMe,
  google,
  googleCallback,
} = require("../controllers/auth");

const router = express.Router();
const { protect } = require("../middleware/auth");

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/me").get(protect, getMe);

router.route("/google").get(google);
router.route("/google/callback").get(googleCallback);

module.exports = router;
