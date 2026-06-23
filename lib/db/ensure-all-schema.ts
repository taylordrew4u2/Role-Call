import { ensureSeriesSchema } from "./ensure-series-schema";
import { ensureScriptSchema } from "./ensure-script-schema";

export function ensureAllSchema(): Promise<[void, void]> {
  return Promise.all([ensureSeriesSchema(), ensureScriptSchema()]);
}
