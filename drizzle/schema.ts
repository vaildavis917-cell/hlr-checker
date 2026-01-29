import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

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
  /** Daily check limit (null = unlimited) */
  dailyLimit: int("dailyLimit"),
  /** Weekly check limit (null = unlimited) */
  weeklyLimit: int("weeklyLimit"),
  /** Monthly check limit (null = unlimited) */
  monthlyLimit: int("monthlyLimit"),
  /** Per-batch limit (null = unlimited) */
  batchLimit: int("batchLimit"),
  /** Checks used today */
  checksToday: int("checksToday").default(0).notNull(),
  /** Checks used this week */
  checksThisWeek: int("checksThisWeek").default(0).notNull(),
  /** Checks used this month */
  checksThisMonth: int("checksThisMonth").default(0).notNull(),
  /** Last check date for daily reset */
  lastCheckDate: varchar("lastCheckDate", { length: 10 }),
  /** Last check week for weekly reset (ISO week number) */
  lastCheckWeek: varchar("lastCheckWeek", { length: 10 }),
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
  /** Applicant's email */
  email: varchar("email", { length: 320 }).notNull(),
  /** Applicant's phone (optional) */
  phone: varchar("phone", { length: 32 }),
  /** Reason for requesting access */
  reason: text("reason"),
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
