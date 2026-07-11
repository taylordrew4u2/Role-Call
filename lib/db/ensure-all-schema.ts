import { ensureSeriesSchema } from "./ensure-series-schema";
import { ensureScriptSchema } from "./ensure-script-schema";
import { ensureCallSheetSchema } from "./ensure-call-sheet-schema";
import { ensureLocationsSchema } from "./ensure-locations-schema";
import { ensureRolesTemplateSchema } from "./ensure-roles-template-schema";
import { ensureInviteSchema } from "./ensure-invite-schema";

export function ensureAllSchema(): Promise<[void, void, void, void, void, void]> {
  return Promise.all([
    ensureSeriesSchema(),
    ensureScriptSchema(),
    ensureCallSheetSchema(),
    ensureLocationsSchema(),
    ensureRolesTemplateSchema(),
    ensureInviteSchema(),
  ]);
}
