import client from "prom-client";

client.collectDefaultMetrics();

export const httpRequestCounter = new client.Counter({
  name: "flash_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"]
});

export const metricsRegistry = client.register;
