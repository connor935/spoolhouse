import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const filaments = pgTable("filaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  filamentType: text("filament_type").notNull(),
  color: text("color"),
  // Weight of the empty spool only (kg) - entered once when adding
  emptySpoolWeight: numeric("empty_spool_weight", { precision: 8, scale: 3 }).notNull(),
  // Nominal amount of filament on a full spool (kg) - used for % remaining
  fullFilamentWeight: numeric("full_filament_weight", { precision: 8, scale: 3 }).notNull(),
  // Last measured total weight of spool + filament (kg) - what you put on the scale
  measuredTotalWeight: numeric("measured_total_weight", { precision: 8, scale: 3 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Filament = typeof filaments.$inferSelect
export type NewFilament = typeof filaments.$inferInsert
