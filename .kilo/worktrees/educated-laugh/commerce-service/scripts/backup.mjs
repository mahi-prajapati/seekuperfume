import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";
const target=resolve("backups",new Date().toISOString().replaceAll(":","-").replaceAll(".","-"));mkdirSync(target,{recursive:true});
const child=spawn("mongodump",["--uri",process.env.MONGODB_URI,"--out",target],{stdio:"inherit",shell:false});child.on("exit",code=>process.exit(code??1));

