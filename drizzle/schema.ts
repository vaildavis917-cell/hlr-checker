import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Username for login - unique identifier */
  username: varchar("username", { length: 64 }).notNull().unique(),
  /** Bcrypt hashed password */
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  /** Display name */
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("yes").notNull(),
  /** Failed login attempts counter */
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  /** Account locked until this time */
  lockedUntil: timestamp("lockedUntil"),
  /** Daily check limit (null = unlimited) */
  dailyLimit: int("dailyLimit"),
  /** Monthly check limit (null = unlimited) */
  monthlyLimit: int("monthlyLimit"),
  /** Checks used today */
  checksToday: int("checksToday").default(0).notNull(),
  /** Checks used this month */
  checksThisMonth: int("checksThisMonth").default(0).notNull(),
  /** Last check date for daily reset */
  lastCheckDate: varchar("lastCheckDate", { length: 10 }),
  /** Last check month for monthly reset */
  lastCheckMonth: varchar("lastCheckMonth", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * HLR check batches - stores metadata about each bulk check operation
 */
export const hlrBatches = mysqlTable("hlr_batches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }),
  totalNumbers: int("totalNumbers").notNull().default(0),
  processedNumbers: int("processedNumbers").notNull().default(0),
  validNumbers: int("validNumbers").notNull().default(0),
  invalidNumbers: int("invalidNumbers").notNull().default(0),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type HlrBatch = typeof hlrBatches.$inferSelect;
export type InsertHlrBatch = typeof hlrBatches.$inferInsert;

/**
 * HLR results - stores individual phone number check results
 */
export const hlrResults = mysqlTable("hlr_results", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 32 }).notNull(),
  internationalFormat: varchar("internationalFormat", { length: 32 }),
  nationalFormat: varchar("nationalFormat", { length: 32 }),
  countryCode: varchar("countryCode", { length: 8 }),
  countryName: varchar("countryName", { length: 128 }),
  countryPrefix: varchar("countryPrefix", { length: 8 }),
  currentCarrierName: varchar("currentCarrierName", { length: 255 }),
  currentCarrierCode: varchar("currentCarrierCode", { length: 32 }),
  currentCarrierCountry: varchar("currentCarrierCountry", { length: 8 }),
  currentNetworkType: varchar("currentNetworkType", { length: 32 }),
  originalCarrierName: varchar("originalCarrierName", { length: 255 }),
  originalCarrierCode: varchar("originalCarrierCode", { length: 32 }),
  validNumber: varchar("validNumber", { length: 32 }),
  reachable: varchar("reachable", { length: 32 }),
  ported: varchar("ported", { length: 64 }),
  roaming: varchar("roaming", { length: 64 }),
  gsmCode: varchar("gsmCode", { length: 16 }),
  gsmMessage: varchar("gsmMessage", { length: 255 }),
  status: mysqlEnum("hlr_status", ["success", "error"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  rawResponse: json("rawResponse"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HlrResult = typeof hlrResults.$inferSelect;
export type InsertHlrResult = typeof hlrResults.$inferInsert;

/**
 * Invite codes for user registration (no self-registration)
 */
export const inviteCodes = mysqlTable("invite_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  createdBy: int("createdBy").notNull(),
  usedBy: int("usedBy"),
  usedAt: timestamp("usedAt"),
  expiresAt: timestamp("expiresAt"),
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;

/**
 * Action logs - records user actions for audit
 */
export const actionLogs = mysqlTable("action_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActionLog = typeof actionLogs.$inferSelect;
export type InsertActionLog = typeof actionLogs.$inferInsert;

/**
 * Balance alerts - stores low balance notification settings
 */
export const balanceAlerts = mysqlTable("balance_alerts", {
  id: int("id").autoincrement().primaryKey(),
  threshold: int("threshold").notNull().default(10),
  lastAlertSent: timestamp("lastAlertSent"),
  isEnabled: mysqlEnum("isEnabled", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BalanceAlert = typeof balanceAlerts.$inferSelect;
export type InsertBalanceAlert = typeof balanceAlerts.$inferInsert;

/**
 * Export templates - customizable export field configurations per user
 */
export const exportTemplates = mysqlTable("export_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  /** JSON array of field names to include in export */
  fields: json("fields").$type<string[]>().notNull(),
  /** Is this the default template for the user */
  isDefault: mysqlEnum("isDefault", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExportTemplate = typeof exportTemplates.$inferSelect;
export type InsertExportTemplate = typeof exportTemplates.$inferInsert;
