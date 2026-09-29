import { connectDatabase } from "../../src/config/db.js";
import { Product } from "../../src/models/catalog.js";
import mongoose, { Schema } from "mongoose";

const Migration: any = mongoose.models.SchemaMigration || mongoose.model("SchemaMigration", new Schema({ key: { type: String, unique: true }, appliedAt: Date, result: Schema.Types.Mixed }));
const key = "001-backfill-product-status";
await connectDatabase();
if (await Migration.exists({ key })) { console.log(`${key} already applied`); process.exit(0); }
const result = await Product.updateMany({ status: { $exists: false } }, { $set: { status: "draft" } });
await Migration.create({ key, appliedAt: new Date(), result: { matched: result.matchedCount, modified: result.modifiedCount } });
console.log({ key, matched: result.matchedCount, modified: result.modifiedCount });
process.exit(0);

