const express = require("express");
const dotenv = require("dotenv");
const colors = require("colors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/error");
const passport = require("passport");
var cors = require("cors");
var session = require("express-session");

// Load env vars
dotenv.config({ path: ".env" });

var corsOptions = {
  origin: process.env.CLIENT_APP_URL, // Define your client app url here
  optionsSuccessStatus: 200,
};

const app = express();

// Body parser
app.use(express.json());

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
app.use(cors(corsOptions));

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  })
);

// Cookie parser
app.use(cookieParser());

app.use(passport.initialize());
app.use(passport.session());

// Route files
const auth = require("./routes/auth");

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Mount routers
app.use("/api/v1/auth", auth);

app.use(errorHandler);

app.get("/failure", (req, res) => {
  res.status(401).json({ success: false, message: "Authentication failed" });
});

app.get("/success", (req, res) => {
  res.status(200).json({ success: true, message: "Authentication success" });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
