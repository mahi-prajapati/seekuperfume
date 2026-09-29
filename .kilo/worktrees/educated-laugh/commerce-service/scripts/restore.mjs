import { spawn } from "node:child_process";
import { resolve } from "node:path";
import "dotenv/config";
const source=process.argv[2];if(!source)throw new Error("Usage: npm run restore -- backups/<timestamp>/seekuperfumes");
const child=spawn("mongorestore",["--uri",process.env.MONGODB_URI,"--drop",resolve(source)],{stdio:"inherit",shell:false});child.on("exit",code=>process.exit(code??1));
