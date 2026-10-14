import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMemoryStore } from "./store.js";
import { createApi } from "./routes.js";

export function createApp(store = createMemoryStore()) {
  const api = createApi(store);
  const app = new Hono();
  app.use("*", cors());
  app.route("/api", api);
  app.route("/", api);

  app.use("/*", serveStatic({ root: "./dist/client" }));
  app.get("*", async (c) => {
    try {
      const fs = await import("node:fs/promises");
      const html = await fs.readFile("./dist/client/index.html", "utf8");
      return c.html(html);
    } catch {
      return c.text("Not found", 404);
    }
  });

  return app;
}

const store = createMemoryStore();
const app = createApp(store);

const port = Number(process.env.PORT || 3000);
if (process.argv[1]?.endsWith("server/index.ts")) {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  });
}

export { app, store };
export default app;
