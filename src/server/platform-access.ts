import { requireActor } from "./auth";
import { db } from "./db";
import { createPlatformServices } from "./composition/platform-services";
export function platformServices(headers?: Headers) {
  return createPlatformServices(db, { current: () => requireActor(headers) });
}
