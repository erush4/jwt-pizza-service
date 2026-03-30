const config = require("./config.js");

function httpLogger(req, res, next) {
    let send = res.send;
    res.send = (resBody) => {
        const logData = {
            authorized: !!req.headers.authorization,
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            reqBody: req.body,
            resBody: (() => {
                try {
                    return typeof resBody === 'string' ? JSON.parse(resBody) : resBody;
                } catch {
                    return resBody;
                }
            })(),
        };
        const level = statusToLogLevel(res.statusCode);
        log(level, 'http', logData);
        res.send = send;
        return res.send(resBody);
    };
    next();
}

function dbLogger(query) {
    log('info', 'db', query.replace(/\s+/g, ' ').trim());

}

function factoryLogger(req, res) {
    log('info', 'factory', {
        request: req, response: res,
    });
}

function unhandledErrorLogger(err) {
    log('error', 'unhandledError', {message: err.message, status: err.statusCode});
}

function log(level, type, logData) {
    const labels = {component: config.logging.source, level: level, type: type};
    const values = [nowString(), sanitize(logData)];
    const logEvent = {streams: [{stream: labels, values: [values]}]};

    sendLogToGrafana(logEvent);
}

function statusToLogLevel(statusCode) {
    if (statusCode >= 500) {
        return 'error';
    }
    if (statusCode >= 400) {
        return 'warn';
    }
    return 'info';
}

function nowString() {
    return (Date.now() * 1000000).toString();
}

function sanitize(logData) {
    logData = typeof logData === 'string' ? logData : JSON.stringify(logData);

    // Passwords
    logData = logData.replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"*****"');
    logData = logData.replace(/password=[^&\s]*/gi, 'password=*****');

    // API keys / tokens
    logData = logData.replace(/"(api_?key|token|secret|auth)"\s*:\s*"[^"]*"/gi, '"$1":"*****"');

    // Bearer tokens
    logData = logData.replace(/Bearer\s+[^\s"]+/gi, 'Bearer *****');

    // Emails
    logData = logData.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '*****');

    // Pizzas
    logData = logData.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*/g, '[PIZZA_JWT]');
    return logData;
}

async function sendLogToGrafana(event) {
    // Log to Grafana
    const body = JSON.stringify(event);
    try {
        const res = await fetch(`${config.logging.endpointUrl}`, {
            method: 'post', body: body, headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(`${config.logging.accountId}:${config.logging.apiKey}`)
                    .toString('base64')}`,
            },
        });
        if (!res.ok) {
            console.error('Failed to send log to Grafana', res.status.toString(), JSON.stringify(res.body));
        }
    } catch (error) {
        console.log('Error sending log to Grafana:', error);
    }
}


module.exports = {httpLogger, dbLogger, factoryLogger, unhandledErrorLogger};
