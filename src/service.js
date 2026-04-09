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
const {generateMetricData} = require("./generateMetricData");

const app = express();
app.use(express.json());
app.use(setAuthUser);
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
});

app.use("/", httpLogger);
const apiRouter = express.Router();
app.use("/api", requestTracker, apiRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/order", orderRouter);
apiRouter.use("/franchise", franchiseRouter);
apiRouter.use("/test/traffic", (req, res) => {
    const num_minutes = req.body.duration;
    if (!num_minutes) {
        return res.status(400).send({message: "improper usage"})
    }
    generateMetricData(num_minutes * 60 * 1000);
    return res.status(200).send({message: "Traffic starting"});
});

apiRouter.use("/docs", (req, res) => {
    res.json({
        version: version.version, endpoints: [
            ...authRouter.docs, ...userRouter.docs, ...orderRouter.docs, ...franchiseRouter.docs,
        ], config: {factory: config.factory.url, db: config.db.connection.host},
    });
});

app.get("/", (req, res) => {
    res.json({
        message: "welcome to JWT Pizza", version: version.version,
    });
});

app.get('/debug-ip', (req, res) => {
    res.json({
        ip: req.ip, ips: req.ips, forwarded: req.headers['x-forwarded-for']
    })
})

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

app.get('/debug-ip', (req, res) => {
    res.json({
        ip: req.ip, ips: req.ips, forwarded: req.headers['x-forwarded-for']
    })
})

module.exports = app;
