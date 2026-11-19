import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { StatusCodes } from "http-status-codes";

import type { AdmLevelCode } from "@scope/consts/models";

import type { RestApiEnv } from "./rest-api.d.ts";
import { connectDbMiddleware } from "./middlewares/connect-db.middleware.ts";
import { loadConfigMiddleware } from "./middlewares/load-config.middleware.ts";
import { getDbConnection } from "./connect-db.ts";
import { provincesRouter } from "./routers/provinces.router.ts";
import { regionsRouter } from "./routers/regions.router.ts";
import { admEntitiesRouter } from "./routers/adm-entities.router.ts";
import { districtsRouter } from "./routers/districts.router.ts";
import { communesRouter } from "./routers/communes.router.ts";
import { fokontanysRouter } from "./routers/fokontanys.router.ts";
import { locationsRouter } from "./routers/locations.router.ts";
import { errorHandlerMiddleware } from "./middlewares/error-handler.middleware.ts";
import { ADM_GEOJSON_RAW_FILE_URL_BY_CODE } from "./consts/adm-geojson.consts.ts";

await getDbConnection();

const app = new Hono<RestApiEnv>()
  .use(connectDbMiddleware)
  .use(loadConfigMiddleware)
  .use(cors())
  .get("/", (c) => {
    return c.json({});
  })
  .get("/download/adm-geojson/:admLevel", async (c) => {
    const admLevel = c.req.param("admLevel") as AdmLevelCode;
    const sourceURL = ADM_GEOJSON_RAW_FILE_URL_BY_CODE.get(admLevel);
    if (!sourceURL) {
      return c.json(
        {
          error: `The ADM GeoJSON source data is not found for ${admLevel}`,
        },
        StatusCodes.NOT_FOUND,
      );
    }
    const fetchFileResponse = await fetch(sourceURL);
    return new Response(fetchFileResponse.body, {
      headers: {
        "Content-Type": fetchFileResponse.headers.get("content-type") ||
          "application/octet-stream",
        ...(fetchFileResponse.headers.get("content-length") && {
          "Content-Length": fetchFileResponse.headers.get("content-length")!,
        }),
      },
      status: 200,
    });
  })
  .get("/api/config", (c) => {
    const config = c.get("madaAdmConfig");
    return c.json(config, StatusCodes.OK);
  })
  .route("/api/adm_entities", admEntitiesRouter)
  .route("/api/provinces", provincesRouter)
  .route("/api/regions", regionsRouter)
  .route("/api/districts", districtsRouter)
  .route("/api/communes", communesRouter)
  .route("/api/fokontanys", fokontanysRouter)
  .route("/api/locations", locationsRouter)
  .onError(errorHandlerMiddleware);

const port = Deno.env.has("REST_API_PORT")
  ? Number(Deno.env.get("REST_API_PORT")!)
  : 8000;
Deno.serve({ port }, app.fetch);

export type AppType = typeof app;
