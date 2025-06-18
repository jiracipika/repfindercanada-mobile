import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const representatives = pgTable("representatives", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(),
  constituency: text("constituency").notNull(),
  province: text("province").notNull(),
  email: text("email"),
  phone: text("phone"),
  photo: text("photo"),
  website: text("website"),
  parliamentId: text("parliament_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  location: text("location"),
  postalCode: text("postal_code"),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedRepresentatives = pgTable("saved_representatives", {
  id: serial("id").primaryKey(),
  representativeId: integer("representative_id").references(() => representatives.id),
  userId: text("user_id").notNull(), // Simple user identification
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRepresentativeSchema = createInsertSchema(representatives).omit({
  id: true,
  createdAt: true,
});

export const insertSearchSchema = createInsertSchema(searches).omit({
  id: true,
  createdAt: true,
});

export const insertSavedRepresentativeSchema = createInsertSchema(savedRepresentatives).omit({
  id: true,
  createdAt: true,
});

export type Representative = typeof representatives.$inferSelect;
export type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;
export type Search = typeof searches.$inferSelect;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type SavedRepresentative = typeof savedRepresentatives.$inferSelect;
export type InsertSavedRepresentative = z.infer<typeof insertSavedRepresentativeSchema>;
