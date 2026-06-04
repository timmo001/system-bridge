import { createContext } from "@lit/context";

import type { ModuleData } from "~/lib/system-bridge/types-modules";

export const moduleDataContext = createContext<ModuleData>("module-data");
