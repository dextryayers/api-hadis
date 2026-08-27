import { serve } from "@hono/node-server";
import app from "./app.js";

const port = parseInt(process.env.PORT || "3000");

console.log(`API Hadis running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
