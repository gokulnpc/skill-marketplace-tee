import { serve } from "@hono/node-server";

import { app } from "./routes.js";

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`SkillVault API listening on http://localhost:${port}`);
});
