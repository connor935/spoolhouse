import { sql } from "drizzle-orm"
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const filaments = sqliteTable("filaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  filamentType: text("filament_type").notNull(),
  color: text("color"),
  // Weight of the empty spool only (kg) - entered once when adding
  emptySpoolWeight: real("empty_spool_weight").notNull(),
  // Nominal amount of filament on a full spool (kg) - used for % remaining
  fullFilamentWeight: real("full_filament_weight").notNull(),
  // Last measured total weight of spool + filament (kg) - what you put on the scale
  measuredTotalWeight: real("measured_total_weight").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type Filament = typeof filaments.$inferSelect
export type NewFilament = typeof filaments.$inferInsert
