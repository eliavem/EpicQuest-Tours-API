const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const { whitelist } = require("validator");

const app = express();

// set CORS
app.use(cors());

// 1) GLOBAL MIDDLEWARES

// Serving static files
app.use(express.static(`${__dirname}/public`));

// Set security http headers
app.use(helmet());

// Development tooling
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour"
});

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));

// Data sanitization agains NoSQL query injection
app.use(mongoSanitize());

// Data Sanitazation against XSS
app.use(xss());

// Prevent Parameter polution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price"
    ]
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES

app.use("/api", limiter);

app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
