import { hc } from "@hono/hono/client";
import type { AppType } from "@scope/rest-api";
import { REST_API_BASE_URL } from "@/config/rest-api.config.ts";

export abstract class BaseApi {
  protected readonly client = hc<AppType>(REST_API_BASE_URL);
}
