const express = require("express");
const {authRouter, setAuthUser} = require("./routes/authRouter.js");
const orderRouter = require("./routes/orderRouter.js");
const franchiseRouter = require("./routes/franchiseRouter.js");
const userRouter = require("./routes/userRouter.js");
const version = require("./version.json");
const config = require("./config.js");
const {requestTracker} = require("./metrics");
const {httpLogger} = require("./logger.js");
const {unhandledErrorLogger} = require("./logger");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const {decodeBody} = require("./routes/decodeBody");

const app = express();

app.set('trust proxy', 1)

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {message: 'Hold your horses. Take a deep breath. You do not need this many pizzas (don\'t tell the CEO I said that). Try again in 15 minutes.'}
})

app.use(express.json());
app.use(helmet())
app.use(globalLimiter)
app.use(setAuthUser);
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
});

const apiRouter = express.Router();
app.use("/api", decodeBody, httpLogger, requestTracker, apiRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/order", orderRouter);
apiRouter.use("/franchise", franchiseRouter);

apiRouter.use("/docs", (req, res) => {
    res.json({
        version: version.version, endpoints: [
            ...authRouter.docs, ...userRouter.docs, ...orderRouter.docs, ...franchiseRouter.docs,
        ], config: {factory: config.factory.url, db: config.db.connection.host},
    });
});

app.get("/", httpLogger, (req, res) => {
    res.json({
        message: "welcome to JWT Pizza", version: version.version,
    });
});

app.use("*", (req, res) => {
    res.status(404).json({
        message: "unknown endpoint",
    });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
    if ((err.statusCode ?? 500) >= 500) {
        unhandledErrorLogger(err);
    }
    res.status(err.statusCode ?? 500).json({message: err.message});
    next();
});

module.exports = app;
