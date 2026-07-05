import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./auth-schema"

export * from "./auth-schema"

// Global spool-type catalog: admin-curated, users can submit requests.
// A pending type is immediately usable by its submitter, visible to others
// only once approved.
export const spoolTypes = sqliteTable("spool_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  manufacturer: text("manufacturer").notNull(),
  name: text("name").notNull(),
  // Weight of the bare, empty spool (g)
  emptyWeightGrams: integer("empty_weight_grams").notNull(),
  status: text("status").notNull().default("pending"), // approved | pending | rejected
  submittedById: text("submitted_by_id").references(() => user.id, { onDelete: "set null" }),
  reviewedById: text("reviewed_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const filaments = sqliteTable("filaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  filamentType: text("filament_type").notNull(),
  color: text("color"),
  // Empty-spool weight comes from the referenced spool type
  spoolTypeId: integer("spool_type_id")
    .notNull()
    .references(() => spoolTypes.id),
  // Nominal amount of filament on a full spool (g) - used for % remaining
  fullFilamentWeightGrams: integer("full_filament_weight_grams").notNull(),
  // Last measured total weight of spool + filament (g) - what you put on the scale
  measuredTotalWeightGrams: integer("measured_total_weight_grams").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type Filament = typeof filaments.$inferSelect
export type NewFilament = typeof filaments.$inferInsert
export type SpoolType = typeof spoolTypes.$inferSelect
export type NewSpoolType = typeof spoolTypes.$inferInsert
