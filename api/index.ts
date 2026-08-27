import { handle } from "hono/vercel";
import app from "../src/app";

// Vercel Serverless Function entry - handle wraps Hono for Vercel's Node runtime
export default handle(app);
