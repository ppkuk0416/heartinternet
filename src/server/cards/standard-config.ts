import config from "../../../config/hearthstone-standard.json";
import type { StandardLegalityConfig } from "@/server/cards/types";

export const standardLegalityConfig = config satisfies StandardLegalityConfig;
