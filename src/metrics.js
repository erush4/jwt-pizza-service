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
let service_latency = 0;
let service_requests = 0;
let active_users = {}

function addActiveUser(userId) {
    active_users[userId] = (active_users[userId] || 0) + 1;
}

function removeActiveUser(userId) {
    active_users[userId] = (active_users[userId] || 0) - 1;
    if (active_users[userId] <= 0) {
        delete active_users[userId];
    }
}

// Middleware to track requests
function requestTracker(req, res, next) {
    const startTime = Date.now();
    const method = `${req.method}`;
    requests[method] = (requests[method] || 0) + 1;
    requests['total']++;
    res.on('finish', () => {
        service_latency += (Date.now() - startTime);
        service_requests += 1;
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

function sendMetricsToGrafana(metrics) {
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
    setInterval(() => {
        try {
            const metrics = [];
            //http method metrics
            Object.keys(requests).forEach((method) => {
                metrics.push(createMetric('requests', requests[method], '1', 'sum', 'asInt', {method: method}));
            });
            const http_latency = service_latency / service_requests;
            service_latency = 0;
            service_requests = 0;
            metrics.push(createMetric('latency'), http_latency, 'ms', 'gauge', 'asDouble', {type: "service"});

            //system metrics
            metrics.push(createMetric('hardware_use', getCpuUsagePercentage(), '%', 'gauge', 'asDouble', {component: 'cpu'}));
            metrics.push(createMetric('hardware_use', getMemoryUsagePercentage(), '%', 'gauge', 'asDouble', {component: 'memory'}));

            // user metrics
            metrics.push(createMetric('active_users', Object.keys(active_users).length, '1', 'gauge', 'asInt', {}));

            metrics.add(purchaseMetrics);
            metrics.add(authMetrics);

            //pizza metrics

            sendMetricsToGrafana(metrics);
        } catch (error) {
            console.log('Error sending metrics', error);
        }
    }, period);
}

sendMetricsPeriodically(10_000); //send metrics every 10 seconds

module.exports = {
    request_tracker: requestTracker,
}