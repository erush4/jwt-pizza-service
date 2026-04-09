# Incident: 2026-04-06 12:32:00 MDT

## Summary

Between approximately 18:32 and 18:37 UTC, **all users were unable to order pizzas**. During this period, HTTP requests
from our service to the JWT Pizza Factory returned the response code `500`.

This was caused by a chaos testing event, initiated the day prior, and was resolved by identifying an appropriate link
(sent in the Factory response body) to end the chaos state.

This incident led to an **immediate loss of ฿5.28** ($368,000) in the form of failed pizzas, estimated by average
traffic rates.

## Detection

The incident was detected approximately 6 seconds later, thanks to a fortuitously-timed routine examination of
production metrics. Had this inspection not taken place, the first detection would have been **3 minutes after the
incident began ** (18:35 UTC) when Grafana detected a sudden revenue dip and alerted the development team via email.

Notably, the Grafana alert for failing pizza orders **failed to trigger**. Thanks to an error in the simulated traffic
script, the failing pizza orders caused the script to terminate, preventing the number of failing orders from rising
enough to trigger the alert. This bug has since been resolved; future chaos tests will not encounter the same issue.

Although the incident was quickly detected and resolved, had it taken place two hours later, the entire dev team (of
one) would have been in class, unable to respond. Expanding this team to ensure round-the-clock coverage is essential to
avoiding such a scenario in the future.

Additionally, the Grafana alert was sent several minutes after the incident started, well after revenue reached zero.
Faster alarm alternatives should be examined and considered in order to allow for immediate response.

## Impact

For approximately 5 minutes (18:32–18:37) on 4/6/2026, all pizza factory orders failed, preventing all 5 active users
from making purchases.

It is estimated that during this time, approximately ฿5.28 worth of pizzas would have been ordered.

Other website functionality was unaffected.

## Timeline

| Time       | Event                                                                                                              |
|------------|--------------------------------------------------------------------------------------------------------------------|
| _18:32:00_ | An order with less than 20 pizzas fails, returning `500`. Simulated traffic stops.                                 |
| _18:32:06_ | Engineer notices failed call in log. Investigation starts.                                                         |
| _18:33:10_ | Halted traffic becomes evident in metrics page.                                                                    |
| _18:33:22_ | `End Chaos` URL discovered in Factory response. Resolution intentionally delayed to ensure Grafana alerts trigger. |
| _18:35:10_ | Grafana `Low Revenue`alert is triggered. Notification chain initiated.                                             |
| _18:35:41_ | Simulated traffic is restarted.                                                                                    |
| _18:35:41_ | Grafana alert received by development team.                                                                        |
| _18:35:51_ | A second order fails. Simulated traffic halts.                                                                     |
| _18:36:44_ | `End Chaos` URL is followed. Pizza orders should now succeed.                                                      |
| _18:37:00_ | Halted traffic is again evident in metrics.                                                                        |
| _18:39:17_ | Traffic script corrected and restarted.                                                                            |
| _18:40:41_ | `Low Revenue` alert resolved.                                                                                      |
| _19:45:00_ | Normal operation for 5 minutes. Incident marked as resolved.                                                       |

## Response

The entire development team (of 1) was immediately aware of the issue and began diagnosing the problem using metrics
stored in Grafana.

Although a solution was quickly identified, steps were not taken to mitigate the problem for several minutes to ensure
Grafana alerts would appropriately trigger. This was done as a test of the alert software, so that if future incidents
occur while the dev team is _not_ actively viewing the metrics, they will be notified.

## Root cause

The JWT Pizza Factory temporarily refused to fulfil orders due to scheduled chaos testing.

## Resolution

The service was restored by following a link to end the chaos testing, which was being returned with each call to the
JWT Pizza Factory.

It is unlikely that this issue could have been resolved faster than it did, other than the additional time spent between
identifying a solution and ensuring that the appropriate alerts were being triggered. Faster alerts from the monitoring
software could be implemented ensure that the team is aware of future problems more quickly.

## Moving Forward

The JWT Pizza Factory represents a critical part of the product pipeline, but is entirely out of our control. If the
service ever goes down, we are unable to generate any revenue.

Efforts should be made to reduce reliance on third-parties to produce our pizzas. If possible, the pizza production
process should be managed entirely on the current backend service, without the need for HTTP calls.

Alternatively, we can produce pizza tokens from multiple sources, so that in the event one fails, the system can
automatically redirect new orders to the other factories.

It may be also worthwhile to offer PASETO, Branca, or Fernet Pizzas in addition to our flagship JWT Pizzas.
