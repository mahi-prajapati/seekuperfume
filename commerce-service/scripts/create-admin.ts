import bcrypt from "bcryptjs";
import { connectDatabase } from "../src/config/db.js";
import { Admin, PERMISSIONS, Role } from "../src/models/admin.js";

const [email, password, name = "Store Administrator"] = process.argv.slice(2);
if (!email || !password || password.length < 12) throw new Error("Usage: npm run create-admin -- email password[12+] [name]");
await connectDatabase();
const role = await Role.findOneAndUpdate({ name: "SUPER_ADMIN" }, { $set: { description: "Full system access", permissions: [...PERMISSIONS], isSystem: true } }, { upsert: true, new: true });
const passwordHash = await bcrypt.hash(password, 12);
await Admin.findOneAndUpdate({ email: email.toLowerCase() }, { $set: { name, passwordHash, roleIds: [role._id], status: "active", passwordChangedAt: new Date() } }, { upsert: true, new: true });
console.log(`Admin ready: ${email.toLowerCase()}`);
process.exit(0);

