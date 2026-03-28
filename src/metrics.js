const config = require('./config');
const os = require('os');
const {DB} = require("./database/database.js");

// Metrics stored in memory
const requests = {};
let service_latency = 0;
let service_requests = 0;
let pizza_latency = 0;
let pizzas_purchased = 0;
let pizza_fails = 0;
let pizza_period_requests = 0;
let pizza_revenue = 0;
let successful_logins = 0;
let failed_logins = 0;

function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
}

function addPizzaPurchase(failed, latency, items) {
    if (failed) {
        pizza_fails += items.length;
    } else {
        for (let i = 0; i < items.length; i++) {
            pizza_revenue += items[i].price
        }
        pizzas_purchased += items.length
    }
    pizza_period_requests += 1
    pizza_latency += latency;
}

function addLoginMetric(failed) {
    if (failed) {
        failed_logins += 1;
    } else {
        successful_logins += 1;
    }
}

// Middleware to track requests
function requestTracker(req, res, next) {
    if (req.method === 'OPTIONS' || req.method === 'HEAD' || req.originalUrl.includes('/docs')) {
        return next();
    }
    const startTime = Date.now();
    res.on('finish', () => {
        const route = (req.baseUrl + (req.route?.path || ''))
            .replace(/^\/api/, '')
            .replace(/\/+$/, '');
        const key = `${req.method}:${route || req.path}`;
        requests[key] = (requests[key] || 0) + 1;
        service_latency += (Date.now() - startTime);
        service_requests += 1;
    });
    next();
}

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
    attributes = {...attributes, source: config.metrics.source};

    const metric = {
        name: metricName, unit: metricUnit, [metricType]: {
            dataPoints: [
                {
                    [valueType]: metricValue, timeUnixNano: Date.now() * 1000000, attributes: [],
                },
            ],
        },
    };

    Object.keys(attributes).forEach((key) => {
        metric[metricType].dataPoints[0].attributes.push({
            key: key, value: {stringValue: attributes[key]},
        });
    });

    if (metricType === 'sum') {
        metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
        metric[metricType].isMonotonic = true;
    }

    return metric;
}

function sendMetricsToGrafana(metrics) {
    const body = {
        resourceMetrics: [
            {
                scopeMetrics: [
                    {
                        metrics,
                    },
                ],
            },
        ],
    };

    fetch(`${config.metrics.endpointUrl}`, {
        method: 'POST', body: JSON.stringify(body), headers: {
            Authorization: `Bearer ${config.metrics.accountId}:${config.metrics.apiKey}`,
            'Content-Type': 'application/json'
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP status: ${response.status}`);
            }
        })
        .catch((error) => {
            console.error('Error pushing metrics:', error);
        });
}


function sendMetricsPeriodically(period) {
    const timer = setInterval(async () => {
        try {
            const metrics = [];
            //http method metrics
            // http method+route metrics
            Object.keys(requests).forEach((key) => {
                const [method, ...routeParts] = key.split(':');
                const route = routeParts.join(':'); // handles any colons in the route
                metrics.push(createMetric('requests', requests[key], '1', 'sum', 'asInt', {method, route}));
            });
            if (service_requests > 0) {
                const http_latency = service_latency / service_requests;
                service_latency = 0;
                service_requests = 0;
                metrics.push(createMetric('latency', http_latency, 'ms', 'gauge', 'asDouble', {type: "request"}));
            }
            //system metrics
            metrics.push(createMetric('hardware_use',
                getCpuUsagePercentage(),
                '%',
                'gauge',
                'asDouble',
                {component: 'cpu'}));
            metrics.push(createMetric('hardware_use',
                getMemoryUsagePercentage(),
                '%',
                'gauge',
                'asDouble',
                {component: 'memory'}));

            // user metrics
            metrics.push(createMetric('active_users', await DB.getNumActiveUsers(), '1', 'gauge', 'asInt', {}));

            //pizza metrics
            if (pizza_period_requests > 0) {
                const factory_latency = pizza_latency / pizza_period_requests;
                pizza_latency = 0;
                pizza_period_requests = 0;
                metrics.push(createMetric('latency', factory_latency, 'ms', 'gauge', 'asDouble', {type: "pizza"}));
            }
            metrics.push(createMetric('pizza_purchase',
                pizzas_purchased,
                '1',
                'sum',
                'asInt',
                {type: "pizzas_bought"}));
            metrics.push(createMetric('pizza_purchase',
                pizza_revenue,
                '$',
                'sum',
                'asDouble',
                {type: "pizza_revenue"}));
            metrics.push(createMetric('pizza_purchase', pizza_fails, '1', 'sum', 'asInt', {type: 'pizza_fails'}));

            //auth metrics
            metrics.push(createMetric('login', failed_logins, '1', 'sum', 'asInt', {type: 'failed_logins'}));
            metrics.push(createMetric('login', successful_logins, '1', 'sum', 'asInt', {type: 'successful_logins'}));

            sendMetricsToGrafana(metrics);
        } catch (error) {
            console.log('Error sending metrics', error);
        }
    }, period);
    timer.unref()
}

sendMetricsPeriodically(10_000); //send metrics every 10 seconds

module.exports = {addLoginMetric, addPizzaPurchase, requestTracker}