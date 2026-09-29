import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

async function main() {
  await connectDatabase();
  const server = app.listen(env.PORT, () => console.log(JSON.stringify({ level: "info", message: "Commerce service ready", port: env.PORT })));
  const shutdown = async () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10_000).unref(); };
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
}
main().catch(error => { console.error(JSON.stringify({ level: "fatal", error: String(error) })); process.exit(1); });

