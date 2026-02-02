import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
// Available permissions with descriptions
export const PERMISSIONS = [
  'hlr.single',       // Single HLR check
  'hlr.batch',        // Batch HLR check
  'hlr.export',       // Export results
  'hlr.history',      // View check history
  'hlr.delete',       // Delete batches
  'tools.duplicates', // Use duplicate removal tool
  'admin.users',      // Manage users
  'admin.users.create', // Create new users
  'admin.users.edit',   // Edit user settings
  'admin.users.delete', // Delete users
  'admin.users.limits', // Set user limits
  'admin.audit',      // View audit logs
  'admin.sessions',   // View/manage sessions
  'admin.balance',    // View API balance
  'admin.settings',   // Change system settings
  'admin.permissions', // Manage role permissions
] as const;

export type Permission = typeof PERMISSIONS[number];

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS: Record<Permission, { en: string; ru: string; uk: string }> = {
  'hlr.single': { en: 'Single HLR Check', ru: 'Одиночная HLR проверка', uk: 'Одинична HLR перевірка' },
  'hlr.batch': { en: 'Batch HLR Check', ru: 'Пакетная HLR проверка', uk: 'Пакетна HLR перевірка' },
  'hlr.export': { en: 'Export Results', ru: 'Экспорт результатов', uk: 'Експорт результатів' },
  'hlr.history': { en: 'View Check History', ru: 'Просмотр истории', uk: 'Перегляд історії' },
  'hlr.delete': { en: 'Delete Batches', ru: 'Удаление партий', uk: 'Видалення партій' },
  'tools.duplicates': { en: 'Duplicate Removal Tool', ru: 'Инструмент удаления дубликатов', uk: 'Інструмент видалення дублікатів' },
  'admin.users': { en: 'View Users', ru: 'Просмотр пользователей', uk: 'Перегляд користувачів' },
  'admin.users.create': { en: 'Create Users', ru: 'Создание пользователей', uk: 'Створення користувачів' },
  'admin.users.edit': { en: 'Edit Users', ru: 'Редактирование пользователей', uk: 'Редагування користувачів' },
  'admin.users.delete': { en: 'Delete Users', ru: 'Удаление пользователей', uk: 'Видалення користувачів' },
  'admin.users.limits': { en: 'Set User Limits', ru: 'Установка лимитов', uk: 'Встановлення лімітів' },
  'admin.audit': { en: 'View Audit Logs', ru: 'Просмотр журнала аудита', uk: 'Перегляд журналу аудиту' },
  'admin.sessions': { en: 'Manage Sessions', ru: 'Управление сессиями', uk: 'Управління сесіями' },
  'admin.balance': { en: 'View API Balance', ru: 'Просмотр баланса API', uk: 'Перегляд балансу API' },
  'admin.settings': { en: 'System Settings', ru: 'Системные настройки', uk: 'Системні налаштування' },
  'admin.permissions': { en: 'Manage Permissions', ru: 'Управление правами', uk: 'Управління правами' },
};

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  viewer: ['hlr.history'],
  user: ['hlr.single', 'hlr.batch', 'hlr.export', 'hlr.history', 'tools.duplicates'],
  manager: ['hlr.single', 'hlr.batch', 'hlr.export', 'hlr.history', 'hlr.delete', 'tools.duplicates', 'admin.users', 'admin.audit', 'admin.sessions'],
  admin: [...PERMISSIONS],
};

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
  role: mysqlEnum("role", ["user", "admin", "manager", "viewer"]).default("user").notNull(),
  /** Custom permissions JSON (overrides role defaults if set) */
  customPermissions: text("customPermissions"),
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("yes").notNull(),
  /** Failed login attempts counter */
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  /** Account locked until this time */
  lockedUntil: timestamp("lockedUntil"),
  // ===== HLR Limits =====
  /** Daily HLR check limit (null = unlimited) */
  hlrDailyLimit: int("hlrDailyLimit"),
  /** Weekly HLR check limit (null = unlimited) */
  hlrWeeklyLimit: int("hlrWeeklyLimit"),
  /** Monthly HLR check limit (null = unlimited) */
  hlrMonthlyLimit: int("hlrMonthlyLimit"),
  /** Per-batch HLR limit (null = unlimited) */
  hlrBatchLimit: int("hlrBatchLimit"),
  /** HLR checks used today */
  hlrChecksToday: int("hlrChecksToday").default(0).notNull(),
  /** HLR checks used this week */
  hlrChecksThisWeek: int("hlrChecksThisWeek").default(0).notNull(),
  /** HLR checks used this month */
  hlrChecksThisMonth: int("hlrChecksThisMonth").default(0).notNull(),
  /** Last HLR check date for daily reset */
  hlrLastCheckDate: varchar("hlrLastCheckDate", { length: 10 }),
  /** Last HLR check week for weekly reset (ISO week number) */
  hlrLastCheckWeek: varchar("hlrLastCheckWeek", { length: 10 }),
  /** Last HLR check month for monthly reset */
  hlrLastCheckMonth: varchar("hlrLastCheckMonth", { length: 7 }),
  
  // ===== Email Limits =====
  /** Daily Email check limit (null = unlimited) */
  emailDailyLimit: int("emailDailyLimit"),
  /** Weekly Email check limit (null = unlimited) */
  emailWeeklyLimit: int("emailWeeklyLimit"),
  /** Monthly Email check limit (null = unlimited) */
  emailMonthlyLimit: int("emailMonthlyLimit"),
  /** Per-batch Email limit (null = unlimited) */
  emailBatchLimit: int("emailBatchLimit"),
  /** Email checks used today */
  emailChecksToday: int("emailChecksToday").default(0).notNull(),
  /** Email checks used this week */
  emailChecksThisWeek: int("emailChecksThisWeek").default(0).notNull(),
  /** Email checks used this month */
  emailChecksThisMonth: int("emailChecksThisMonth").default(0).notNull(),
  /** Last Email check date for daily reset */
  emailLastCheckDate: varchar("emailLastCheckDate", { length: 10 }),
  /** Last Email check week for weekly reset (ISO week number) */
  emailLastCheckWeek: varchar("emailLastCheckWeek", { length: 10 }),
  /** Last Email check month for monthly reset */
  emailLastCheckMonth: varchar("emailLastCheckMonth", { length: 7 }),
  
  // ===== Legacy fields (for backward compatibility) =====
  /** @deprecated Use hlrDailyLimit instead */
  dailyLimit: int("dailyLimit"),
  /** @deprecated Use hlrWeeklyLimit instead */
  weeklyLimit: int("weeklyLimit"),
  /** @deprecated Use hlrMonthlyLimit instead */
  monthlyLimit: int("monthlyLimit"),
  /** @deprecated Use hlrBatchLimit instead */
  batchLimit: int("batchLimit"),
  /** @deprecated Use hlrChecksToday instead */
  checksToday: int("checksToday").default(0).notNull(),
  /** @deprecated Use hlrChecksThisWeek instead */
  checksThisWeek: int("checksThisWeek").default(0).notNull(),
  /** @deprecated Use hlrChecksThisMonth instead */
  checksThisMonth: int("checksThisMonth").default(0).notNull(),
  /** @deprecated Use hlrLastCheckDate instead */
  lastCheckDate: varchar("lastCheckDate", { length: 10 }),
  /** @deprecated Use hlrLastCheckWeek instead */
  lastCheckWeek: varchar("lastCheckWeek", { length: 10 }),
  /** @deprecated Use hlrLastCheckMonth instead */
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

/**
 * User sessions - tracks active login sessions for each user
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** JWT token hash for session identification */
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  /** Device/browser info */
  deviceInfo: varchar("deviceInfo", { length: 255 }),
  /** Browser name */
  browser: varchar("browser", { length: 64 }),
  /** Operating system */
  os: varchar("os", { length: 64 }),
  /** IP address */
  ipAddress: varchar("ipAddress", { length: 45 }),
  /** Approximate location based on IP */
  location: varchar("location", { length: 128 }),
  /** Is this the current session */
  isCurrent: mysqlEnum("isCurrent", ["yes", "no"]).default("no").notNull(),
  /** Last activity timestamp */
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  /** Session expiration time */
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;


/**
 * Role permissions - stores custom permission sets for each role
 * If a role has an entry here, it overrides DEFAULT_PERMISSIONS
 */
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  /** Role name (viewer, user, manager, admin) */
  role: varchar("role", { length: 32 }).notNull().unique(),
  /** JSON array of permission strings */
  permissions: json("permissions").$type<Permission[]>().notNull(),
  /** Description of the role */
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;


/**
 * Access requests - stores pending access requests from users
 */
export const accessRequests = mysqlTable("access_requests", {
  id: int("id").autoincrement().primaryKey(),
  /** Applicant's name */
  name: varchar("name", { length: 128 }).notNull(),
  /** Applicant's email (optional) */
  email: varchar("email", { length: 320 }),
  /** Applicant's phone (optional) */
  phone: varchar("phone", { length: 32 }),
  /** Telegram username or phone for access delivery */
  telegram: varchar("telegram", { length: 128 }),
  /** Request status */
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  /** Admin who processed the request */
  processedBy: int("processedBy"),
  /** Admin's comment on the decision */
  adminComment: text("adminComment"),
  /** When the request was processed */
  processedAt: timestamp("processedAt"),
  /** Created user ID (if approved) */
  createdUserId: int("createdUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;


/**
 * System settings - stores global configuration like Telegram notifications
 */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  /** Setting key */
  key: varchar("key", { length: 64 }).notNull().unique(),
  /** Setting value */
  value: text("value"),
  /** Setting description */
  description: varchar("description", { length: 256 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;


/**
 * Email validation batches
 */
export const emailBatches = mysqlTable("email_batches", {
  id: int("id").autoincrement().primaryKey(),
  /** User who created the batch */
  userId: int("userId").notNull(),
  /** Batch name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Total emails in batch */
  totalEmails: int("totalEmails").notNull().default(0),
  /** Processed emails count */
  processedEmails: int("processedEmails").notNull().default(0),
  /** Valid emails count */
  validEmails: int("validEmails").notNull().default(0),
  /** Invalid emails count */
  invalidEmails: int("invalidEmails").notNull().default(0),
  /** Risky emails count (catch_all, disposable) */
  riskyEmails: int("riskyEmails").notNull().default(0),
  /** Unknown emails count */
  unknownEmails: int("unknownEmails").notNull().default(0),
  /** Batch status */
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type EmailBatch = typeof emailBatches.$inferSelect;
export type InsertEmailBatch = typeof emailBatches.$inferInsert;

/**
 * Email validation results
 */
export const emailResults = mysqlTable("email_results", {
  id: int("id").autoincrement().primaryKey(),
  /** Batch ID */
  batchId: int("batchId").notNull(),
  /** Email address */
  email: varchar("email", { length: 320 }).notNull(),
  /** Quality: good, bad, unknown */
  quality: varchar("quality", { length: 32 }),
  /** Result: ok, catch_all, unknown, invalid, disposable, error */
  result: varchar("result", { length: 32 }),
  /** Result code */
  resultCode: int("resultCode"),
  /** Subresult details */
  subresult: varchar("subresult", { length: 64 }),
  /** Is free email provider */
  isFree: boolean("isFree").default(false),
  /** Is role-based email (info@, support@) */
  isRole: boolean("isRole").default(false),
  /** Did you mean suggestion */
  didYouMean: varchar("didYouMean", { length: 320 }),
  /** Execution time in ms */
  executionTime: int("executionTime"),
  /** Error message if any */
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailResult = typeof emailResults.$inferSelect;
export type InsertEmailResult = typeof emailResults.$inferInsert;

/**
 * Email cache - stores previous verification results to avoid duplicate API calls
 */
export const emailCache = mysqlTable("email_cache", {
  id: int("id").autoincrement().primaryKey(),
  /** Email address (unique) */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Quality: good, bad, unknown */
  quality: varchar("quality", { length: 32 }),
  /** Result: ok, catch_all, unknown, invalid, disposable, error */
  result: varchar("result", { length: 32 }),
  /** Result code */
  resultCode: int("resultCode"),
  /** Subresult details */
  subresult: varchar("subresult", { length: 64 }),
  /** Is free email provider */
  isFree: boolean("isFree").default(false),
  /** Is role-based email */
  isRole: boolean("isRole").default(false),
  /** Did you mean suggestion */
  didYouMean: varchar("didYouMean", { length: 320 }),
  /** When the cache entry was created */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** When the cache entry expires (30 days) */
  expiresAt: timestamp("expiresAt").notNull(),
});
export type EmailCache = typeof emailCache.$inferSelect;
export type InsertEmailCache = typeof emailCache.$inferInsert;
