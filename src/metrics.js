const config = require('config.js');
const os = require('os');

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

// Metrics stored in memory
const requests = {};
let period_latency = 0;
let period_requests = 0;

// Middleware to track requests
function requestTracker(req, res, next) {
    const startTime = Date.now();
    const endpoint = `[${req.method}] ${req.path}`;
    requests[endpoint] = (requests[endpoint] || 0) + 1;
    requests['total']++;
    res.on('finish', () => {
        period_latency += (Date.now() - startTime);
        period_requests++;
    })
    next();
}

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
    attributes = {...attributes, source: config.metrics.source};

    const metric = {
        name: metricName, unit: metricUnit, [metricType]: {
            dataPoints: [{
                [valueType]: metricValue, timeUnixNano: Date.now() * 1000000, attributes: [],
            },],
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

function sendMetricToGrafana(metrics) {
    const body = {
        resourceMetrics: [{
            scopeMetrics: [{
                metrics,
            },],
        },],
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
    const timer = setInterval(() => {
        try {
            const metrics = new OtelMetricBuilder();
            metrics.add(httpMetrics);
            metrics.add(systemMetrics);
            metrics.add(userMetrics);
            metrics.add(purchaseMetrics);
            metrics.add(authMetrics);

            metrics.sendToGrafana();
        } catch (error) {
            console.log('Error sending metrics', error);
        }
    }, period);
}

sendMetricsPeriodically(10_000); //send metrics every 10 seconds

module.exports = {
    request_tracker: requestTracker,
}