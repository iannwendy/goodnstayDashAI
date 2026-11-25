import { PartnerAnalyticsService } from "./bigqueryService.js";
import { loadConfig } from "./config.js";
import { BigQueryCostGuard } from "./costGuard.js";
import { createBffServer } from "./server.js";

const cfg = loadConfig();
const costGuard = new BigQueryCostGuard(cfg);
const service = new PartnerAnalyticsService(cfg, costGuard);
const server = createBffServer(cfg, service);

server.listen(cfg.port, cfg.host, () => {
  console.log(
    `[goodnstay-bigquery-bff] Listening on http://${cfg.host}:${cfg.port} | Project=${cfg.gcpProjectId} (${cfg.bqLocation}) | MaxBytes/Query=${(
      cfg.maxBytesBilledPerQuery /
      (1024 * 1024)
    ).toFixed(0)} MiB | DailyBudget=${(
      cfg.dailyBilledByteBudget /
      (1024 * 1024)
    ).toFixed(0)} MiB | DryRunPreflight=${cfg.enableDryRunPreflight}`,
  );
});
