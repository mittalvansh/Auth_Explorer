const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const {
  hashPassword,
  getSignedJwtToken,
  comparePassword,
} = require("../utils/passwordHandler");
const passport = require("passport");

require("../passport/auth");
require("dotenv").config();

// @ desc Register user
// @ route POST /api/v1/auth/register
// @ access Public
exports.register = asyncHandler(async (req, res, next) => {
  let { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  const userExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (userExists) {
    return next(new ErrorResponse("User already exists", 400));
  }

  password = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password,
    },
  });

  sendTokenResponse(user, 200, res);
});

// @ desc Login user
// @ route POST /api/v1/auth/login
// @ access Public

exports.login = asyncHandler(async (req, res, next) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  sendTokenResponse(user, 200, res);
});

exports.google = asyncHandler(async (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

exports.googleCallback = asyncHandler(async (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, userinfo) => {
    if (err) {
      return res.redirect("/failure");
    }

    const { emails } = userinfo;
    const email = emails[0].value;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
        },
      });
    }

    const token = getSignedJwtToken({ id: user.id });
    const options = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === "production") {
      options.secure = true;
    }

    res.cookie("token", token, options);
    return res.redirect("/success");
  })(req, res, next);
});

// @ desc Get current logged in user
// @ route GET /api/v1/auth/me
// @ access Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = getSignedJwtToken({ id: user.id });

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};
