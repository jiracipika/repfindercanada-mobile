import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const representatives = pgTable("representatives", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(),
  constituency: text("constituency").notNull(),
  province: text("province").notNull(),
  electedOffice: text("elected_office"), // e.g., "MP", "MPP", "Mayor", "Councillor"
  email: text("email"),
  phone: text("phone"),
  photo: text("photo"),
  website: text("website"),
  personalWebsite: text("personal_website"),
  socialMedia: jsonb("social_media"), // Twitter, Facebook, Instagram, etc.
  biography: text("biography"),
  offices: jsonb("offices"), // Legislature and constituency office details
  fax: text("fax"),
  parliamentId: text("parliament_id").unique(),
  boundaryUrl: text("boundary_url"), // URL to fetch GeoJSON boundary from Represent API
  boundaryData: jsonb("boundary_data"), // Cached GeoJSON boundary shape
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

// Postal code to riding cache and corrections
export const postalCodeCache = pgTable("postal_code_cache", {
  id: serial("id").primaryKey(),
  postalCode: text("postal_code").notNull().unique(), // 6-character postal code (e.g., K1A0A6)
  ridingName: text("riding_name").notNull(), // Federal electoral district name
  province: text("province").notNull(),
  source: text("source").notNull(), // e.g., "represent_api", "manual_correction", "house_of_commons"
  confidence: text("confidence"), // "high", "medium", "low" - indicates data quality
  manualOverride: boolean("manual_override").default(false), // True if manually corrected
  boundaryUrl: text("boundary_url"), // Link to boundary data
  lastVerified: timestamp("last_verified").defaultNow(),
  notes: text("notes"), // For tracking why corrections were made
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track House of Commons official MP data
export const officialMPData = pgTable("official_mp_data", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ridingName: text("riding_name").notNull(),
  province: text("province").notNull(),
  party: text("party").notNull(),
  parliamentId: text("parliament_id").unique(),
  email: text("email"), // parl.gc.ca email
  phone: text("phone"),
  constituencyOffice: jsonb("constituency_office"), // Scraped from ourcommons.ca
  hillOffice: jsonb("hill_office"), // Parliament Hill office
  photoUrl: text("photo_url"),
  profileUrl: text("profile_url"), // ourcommons.ca profile URL
  lastScraped: timestamp("last_scraped").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertPostalCodeCacheSchema = createInsertSchema(postalCodeCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfficialMPDataSchema = createInsertSchema(officialMPData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Representative = typeof representatives.$inferSelect;
export type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;
export type Search = typeof searches.$inferSelect;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type SavedRepresentative = typeof savedRepresentatives.$inferSelect;
export type InsertSavedRepresentative = z.infer<typeof insertSavedRepresentativeSchema>;
export type PostalCodeCache = typeof postalCodeCache.$inferSelect;
export type InsertPostalCodeCache = z.infer<typeof insertPostalCodeCacheSchema>;
export type OfficialMPData = typeof officialMPData.$inferSelect;
export type InsertOfficialMPData = z.infer<typeof insertOfficialMPDataSchema>;
