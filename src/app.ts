import { Hono } from "hono";
import { cors } from "hono/cors";
const app = new Hono();
app.use("*", cors({ origin: "*", allowMethods: ["GET"], allowHeaders: ["Content-Type", "Accept"], maxAge: 86400 }));
app.get("/", (c) => c.json({ ok: true, books: 11 }));
app.get("/books", (c) => c.json({ data: [{ id: "bukhari", name: "Shahih Bukhari", available: 6638 }], total: 1 }));
app.get("/books/:book", (c) => c.json({ book: c.req.param("book"), data: [{ number: 1, arab: "test", id: "test" }] }));
app.notFound((c) => c.json({ error: "not found" }, 404));
export default app;
