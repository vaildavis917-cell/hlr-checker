import { eq, desc, sql, and, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, hlrBatches, hlrResults, InsertHlrBatch, InsertHlrResult, HlrBatch, HlrResult, inviteCodes, InsertInviteCode, InviteCode, User, actionLogs, InsertActionLog, ActionLog, balanceAlerts, BalanceAlert, exportTemplates, ExportTemplate, InsertExportTemplate, sessions, Session, InsertSession, accessRequests, AccessRequest, InsertAccessRequest, systemSettings, SystemSetting, emailBatches, EmailBatch, InsertEmailBatch, emailResults, EmailResult, InsertEmailResult, emailCache, EmailCache, InsertEmailCache, customRoles, CustomRole, InsertCustomRole } from "../drizzle/schema";
import bcrypt from "bcryptjs";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User authentication operations
export async function createUser(data: {
  username: string;
  password: string;
  name?: string;
  email?: string;
  role?: "user" | "admin" | "manager" | "viewer";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await bcrypt.hash(data.password, 10);
  
  const result = await db.insert(users).values({
    username: data.username,
    passwordHash,
    name: data.name || null,
    email: data.email || null,
    role: data.role || "user",
  });
  
  return result[0].insertId;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function verifyPassword(username: string, password: string): Promise<{ user: User | null; locked: boolean; attemptsLeft: number }> {
  const user = await getUserByUsername(username);
  if (!user) return { user: null, locked: false, attemptsLeft: 5 };
  if (user.isActive !== "yes") return { user: null, locked: false, attemptsLeft: 0 };
  
  // Check if account is locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return { user: null, locked: true, attemptsLeft: 0 };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  const db = await getDb();
  
  if (!isValid) {
    // Increment failed attempts
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updates: Partial<InsertUser> = { failedLoginAttempts: newAttempts };
    
    // Lock account after 5 failed attempts for 15 minutes
    if (newAttempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      updates.lockedUntil = lockUntil;
    }
    
    if (db) {
      await db.update(users).set(updates).where(eq(users.id, user.id));
    }
    
    return { user: null, locked: newAttempts >= 5, attemptsLeft: Math.max(0, 5 - newAttempts) };
  }

  // Reset failed attempts on successful login
  if (db) {
    await db.update(users).set({ 
      lastSignedIn: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null
    }).where(eq(users.id, user.id));
  }

  return { user, locked: false, attemptsLeft: 5 };
}

export async function updateUserPassword(id: number, newPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

// HLR Batch operations
export async function createHlrBatch(batch: InsertHlrBatch): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(hlrBatches).values(batch);
  return result[0].insertId;
}

export async function updateHlrBatch(id: number, updates: Partial<InsertHlrBatch>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(hlrBatches).set(updates).where(eq(hlrBatches.id, id));
}

export async function getHlrBatchById(id: number): Promise<HlrBatch | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(hlrBatches).where(eq(hlrBatches.id, id)).limit(1);
  return result[0];
}

export async function getHlrBatchesByUserId(userId: number): Promise<HlrBatch[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(hlrBatches).where(eq(hlrBatches.userId, userId)).orderBy(desc(hlrBatches.createdAt));
}

// HLR Results operations
export async function createHlrResult(result: InsertHlrResult): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const insertResult = await db.insert(hlrResults).values(result);
  return insertResult[0].insertId;
}

export async function createHlrResults(results: InsertHlrResult[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (results.length === 0) return;
  await db.insert(hlrResults).values(results);
}

export async function getHlrResultsByBatchId(batchId: number): Promise<HlrResult[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(hlrResults).where(eq(hlrResults.batchId, batchId)).orderBy(hlrResults.id);
}

export async function deleteHlrBatch(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(hlrResults).where(eq(hlrResults.batchId, id));
  await db.delete(hlrBatches).where(eq(hlrBatches.id, id));
}

// Get cached result for a phone number (within last N hours)
export async function getCachedResult(phoneNumber: string, hoursAgo: number = 24): Promise<HlrResult | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  const results = await db.select()
    .from(hlrResults)
    .where(
      and(
        eq(hlrResults.phoneNumber, phoneNumber),
        gte(hlrResults.createdAt, cutoffDate),
        eq(hlrResults.status, "success")
      )
    )
    .orderBy(desc(hlrResults.createdAt))
    .limit(1);
  
  return results[0];
}

// Get cached results for multiple phone numbers
// Splits into chunks to avoid MySQL IN() limit (~1000 elements)
export async function getCachedResults(phoneNumbers: string[], hoursAgo: number = 24): Promise<Map<string, HlrResult>> {
  const db = await getDb();
  if (!db) return new Map();
  
  if (phoneNumbers.length === 0) return new Map();
  
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const cacheMap = new Map<string, HlrResult>();
  
  // Process in chunks of 500 to avoid MySQL IN() limit
  const CHUNK_SIZE = 500;
  for (let i = 0; i < phoneNumbers.length; i += CHUNK_SIZE) {
    const chunk = phoneNumbers.slice(i, i + CHUNK_SIZE);
    
    try {
      const results = await db.select()
        .from(hlrResults)
        .where(
          and(
            inArray(hlrResults.phoneNumber, chunk),
            gte(hlrResults.createdAt, cutoffDate),
            eq(hlrResults.status, "success")
          )
        )
        .orderBy(desc(hlrResults.createdAt));
      
      // Add to map with most recent result for each phone
      for (const result of results) {
        if (!cacheMap.has(result.phoneNumber)) {
          cacheMap.set(result.phoneNumber, result);
        }
      }
    } catch (error) {
      console.error(`[Cache] Error fetching chunk ${i}-${i + CHUNK_SIZE}:`, error);
      // Continue with other chunks even if one fails
    }
  }
  
  return cacheMap;
}

// User management operations
export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function deleteUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete user's HLR data first
  const userBatches = await db.select().from(hlrBatches).where(eq(hlrBatches.userId, id));
  for (const batch of userBatches) {
    await db.delete(hlrResults).where(eq(hlrResults.batchId, batch.id));
  }
  await db.delete(hlrBatches).where(eq(hlrBatches.userId, id));
  await db.delete(exportTemplates).where(eq(exportTemplates.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

export async function updateUserRole(id: number, role: "user" | "admin" | "manager" | "viewer"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function toggleUserActive(id: number, isActive: "yes" | "no"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ isActive }).where(eq(users.id, id));
}

// Invite code operations (keeping for backwards compatibility, but not used for auth)
export async function createInviteCode(invite: InsertInviteCode): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(inviteCodes).values(invite);
  return result[0].insertId;
}

export async function getInviteCodeByCode(code: string): Promise<InviteCode | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  return result[0];
}

export async function getAllInviteCodes(createdBy?: number): Promise<InviteCode[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (createdBy) {
    return await db.select().from(inviteCodes).where(eq(inviteCodes.createdBy, createdBy)).orderBy(desc(inviteCodes.createdAt));
  }
  return await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
}

export async function useInviteCode(code: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const invite = await getInviteCodeByCode(code);
  if (!invite || invite.isActive !== "yes" || invite.usedBy) return false;
  
  await db.update(inviteCodes).set({
    usedBy: userId,
    usedAt: new Date(),
    isActive: "no",
  }).where(eq(inviteCodes.code, code));
  
  return true;
}

export async function deleteInviteCode(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
}

// Check if any admin exists (for initial setup)
export async function hasAnyAdmin(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  return result.length > 0;
}


// Action logging
export async function logAction(data: {
  userId: number;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(actionLogs).values({
    userId: data.userId,
    action: data.action,
    details: data.details || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null,
  });
}

export async function getActionLogs(params: {
  userId?: number;
  actions?: string[];
  limit?: number;
} = {}): Promise<ActionLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { userId, actions, limit = 100 } = params;
  const conditions = [];
  
  if (userId) {
    conditions.push(eq(actionLogs.userId, userId));
  }
  if (actions && actions.length > 0) {
    conditions.push(inArray(actionLogs.action, actions));
  }
  
  if (conditions.length > 0) {
    return await db.select().from(actionLogs)
      .where(and(...conditions))
      .orderBy(desc(actionLogs.createdAt))
      .limit(limit);
  }
  
  return await db.select().from(actionLogs)
    .orderBy(desc(actionLogs.createdAt))
    .limit(limit);
}

export async function countActionLogs(params: {
  userId?: number;
  actions?: string[];
} = {}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const { userId, actions } = params;
  const conditions = [];
  
  if (userId) {
    conditions.push(eq(actionLogs.userId, userId));
  }
  if (actions && actions.length > 0) {
    conditions.push(inArray(actionLogs.action, actions));
  }
  
  const result = conditions.length > 0
    ? await db.select({ count: sql<number>`count(*)` }).from(actionLogs).where(and(...conditions))
    : await db.select({ count: sql<number>`count(*)` }).from(actionLogs);
  
  return result[0]?.count || 0;
}

// Get ISO week number
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// User limits management - type: 'hlr' or 'email'
export async function checkUserLimits(userId: number, numbersCount: number, type: 'hlr' | 'email' = 'hlr'): Promise<{ allowed: boolean; reason?: string; limits?: any }> {
  const db = await getDb();
  if (!db) return { allowed: true };
  
  const user = await getUserById(userId);
  if (!user) return { allowed: false, reason: "User not found" };
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisWeek = getISOWeek(now);
  const thisMonth = today.substring(0, 7);
  
  // Use type-specific fields or fallback to legacy fields
  const prefix = type === 'email' ? 'email' : 'hlr';
  const u = user as any;
  
  // Get limits (new fields first, then legacy fallback for HLR)
  const dailyLimit = u[`${prefix}DailyLimit`] ?? (type === 'hlr' ? user.dailyLimit : null);
  const weeklyLimit = u[`${prefix}WeeklyLimit`] ?? (type === 'hlr' ? u.weeklyLimit : null);
  const monthlyLimit = u[`${prefix}MonthlyLimit`] ?? (type === 'hlr' ? user.monthlyLimit : null);
  const batchLimit = u[`${prefix}BatchLimit`] ?? (type === 'hlr' ? u.batchLimit : null);
  
  // Get usage counters
  let checksToday = (u[`${prefix}ChecksToday`] ?? (type === 'hlr' ? user.checksToday : 0)) || 0;
  let checksThisWeek = (u[`${prefix}ChecksThisWeek`] ?? (type === 'hlr' ? u.checksThisWeek : 0)) || 0;
  let checksThisMonth = (u[`${prefix}ChecksThisMonth`] ?? (type === 'hlr' ? user.checksThisMonth : 0)) || 0;
  
  const lastCheckDate = u[`${prefix}LastCheckDate`] ?? (type === 'hlr' ? user.lastCheckDate : null);
  const lastCheckWeek = u[`${prefix}LastCheckWeek`] ?? (type === 'hlr' ? u.lastCheckWeek : null);
  const lastCheckMonth = u[`${prefix}LastCheckMonth`] ?? (type === 'hlr' ? user.lastCheckMonth : null);
  
  // Reset daily counter if new day
  if (lastCheckDate !== today) {
    checksToday = 0;
  }
  
  // Reset weekly counter if new week
  if (lastCheckWeek !== thisWeek) {
    checksThisWeek = 0;
  }
  
  // Reset monthly counter if new month
  if (lastCheckMonth !== thisMonth) {
    checksThisMonth = 0;
  }
  
  const typeLabel = type === 'email' ? 'Email' : 'HLR';
  
  // Check per-batch limit first
  if (batchLimit && numbersCount > batchLimit) {
    return { 
      allowed: false, 
      reason: `${typeLabel} batch limit exceeded. Max: ${batchLimit} per batch`,
      limits: { batchLimit }
    };
  }
  
  // Check daily limit
  if (dailyLimit && checksToday + numbersCount > dailyLimit) {
    return { 
      allowed: false, 
      reason: `${typeLabel} daily limit exceeded. Used: ${checksToday}/${dailyLimit}`,
      limits: { dailyUsed: checksToday, dailyLimit }
    };
  }
  
  // Check weekly limit
  if (weeklyLimit && checksThisWeek + numbersCount > weeklyLimit) {
    return { 
      allowed: false, 
      reason: `${typeLabel} weekly limit exceeded. Used: ${checksThisWeek}/${weeklyLimit}`,
      limits: { weeklyUsed: checksThisWeek, weeklyLimit }
    };
  }
  
  // Check monthly limit
  if (monthlyLimit && checksThisMonth + numbersCount > monthlyLimit) {
    return { 
      allowed: false, 
      reason: `${typeLabel} monthly limit exceeded. Used: ${checksThisMonth}/${monthlyLimit}`,
      limits: { monthlyUsed: checksThisMonth, monthlyLimit }
    };
  }
  
  return { 
    allowed: true,
    limits: {
      dailyUsed: checksToday,
      dailyLimit,
      weeklyUsed: checksThisWeek,
      weeklyLimit,
      monthlyUsed: checksThisMonth,
      monthlyLimit,
      batchLimit,
    }
  };
}

export async function incrementUserChecks(userId: number, count: number, type: 'hlr' | 'email' = 'hlr'): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const user = await getUserById(userId);
  if (!user) return;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisWeek = getISOWeek(now);
  const thisMonth = today.substring(0, 7);
  
  const u = user as any;
  const prefix = type === 'email' ? 'email' : 'hlr';
  
  // Get current counters
  let checksToday = u[`${prefix}ChecksToday`] || (type === 'hlr' ? user.checksToday : 0) || 0;
  let checksThisWeek = u[`${prefix}ChecksThisWeek`] || (type === 'hlr' ? u.checksThisWeek : 0) || 0;
  let checksThisMonth = u[`${prefix}ChecksThisMonth`] || (type === 'hlr' ? user.checksThisMonth : 0) || 0;
  
  const lastCheckDate = u[`${prefix}LastCheckDate`] || (type === 'hlr' ? user.lastCheckDate : null);
  const lastCheckWeek = u[`${prefix}LastCheckWeek`] || (type === 'hlr' ? u.lastCheckWeek : null);
  const lastCheckMonth = u[`${prefix}LastCheckMonth`] || (type === 'hlr' ? user.lastCheckMonth : null);
  
  // Reset if new day/week/month
  if (lastCheckDate !== today) {
    checksToday = 0;
  }
  if (lastCheckWeek !== thisWeek) {
    checksThisWeek = 0;
  }
  if (lastCheckMonth !== thisMonth) {
    checksThisMonth = 0;
  }
  
  // Build update object based on type
  const updateData: any = {};
  if (type === 'email') {
    updateData.emailChecksToday = checksToday + count;
    updateData.emailChecksThisWeek = checksThisWeek + count;
    updateData.emailChecksThisMonth = checksThisMonth + count;
    updateData.emailLastCheckDate = today;
    updateData.emailLastCheckWeek = thisWeek;
    updateData.emailLastCheckMonth = thisMonth;
  } else {
    // HLR - update both new and legacy fields for backward compatibility
    updateData.hlrChecksToday = checksToday + count;
    updateData.hlrChecksThisWeek = checksThisWeek + count;
    updateData.hlrChecksThisMonth = checksThisMonth + count;
    updateData.hlrLastCheckDate = today;
    updateData.hlrLastCheckWeek = thisWeek;
    updateData.hlrLastCheckMonth = thisMonth;
    // Also update legacy fields
    updateData.checksToday = checksToday + count;
    updateData.checksThisWeek = checksThisWeek + count;
    updateData.checksThisMonth = checksThisMonth + count;
    updateData.lastCheckDate = today;
    updateData.lastCheckWeek = thisWeek;
    updateData.lastCheckMonth = thisMonth;
  }
  
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function updateUserLimits(
  userId: number, 
  limits: {
    // HLR limits
    hlrDailyLimit?: number | null;
    hlrWeeklyLimit?: number | null;
    hlrMonthlyLimit?: number | null;
    hlrBatchLimit?: number | null;
    // Email limits
    emailDailyLimit?: number | null;
    emailWeeklyLimit?: number | null;
    emailMonthlyLimit?: number | null;
    emailBatchLimit?: number | null;
    // Legacy fields (for backward compatibility)
    dailyLimit?: number | null;
    weeklyLimit?: number | null;
    monthlyLimit?: number | null;
    batchLimit?: number | null;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set(limits as any).where(eq(users.id, userId));
}

export async function unlockUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ 
    failedLoginAttempts: 0,
    lockedUntil: null 
  }).where(eq(users.id, userId));
}

// Balance alerts
export async function getBalanceAlert(): Promise<BalanceAlert | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(balanceAlerts).limit(1);
  return result[0];
}

export async function upsertBalanceAlert(threshold: number, isEnabled: "yes" | "no"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getBalanceAlert();
  if (existing) {
    await db.update(balanceAlerts).set({ threshold, isEnabled }).where(eq(balanceAlerts.id, existing.id));
  } else {
    await db.insert(balanceAlerts).values({ threshold, isEnabled });
  }
}

export async function updateBalanceAlertSent(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getBalanceAlert();
  if (existing) {
    await db.update(balanceAlerts).set({ lastAlertSent: new Date() }).where(eq(balanceAlerts.id, existing.id));
  }
}

// Statistics
export async function getStatistics(userId?: number): Promise<{
  totalBatches: number;
  totalChecks: number;
  validChecks: number;
  invalidChecks: number;
  todayChecks: number;
  monthChecks: number;
}> {
  const db = await getDb();
  if (!db) return { totalBatches: 0, totalChecks: 0, validChecks: 0, invalidChecks: 0, todayChecks: 0, monthChecks: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  let batches: HlrBatch[];
  if (userId) {
    batches = await db.select().from(hlrBatches).where(eq(hlrBatches.userId, userId));
  } else {
    batches = await db.select().from(hlrBatches);
  }
  
  const totalBatches = batches.length;
  const totalChecks = batches.reduce((sum, b) => sum + (b.totalNumbers || 0), 0);
  const validChecks = batches.reduce((sum, b) => sum + (b.validNumbers || 0), 0);
  const invalidChecks = batches.reduce((sum, b) => sum + (b.invalidNumbers || 0), 0);
  
  const todayBatches = batches.filter(b => new Date(b.createdAt) >= today);
  const todayChecks = todayBatches.reduce((sum, b) => sum + (b.totalNumbers || 0), 0);
  
  const monthBatches = batches.filter(b => new Date(b.createdAt) >= monthStart);
  const monthChecks = monthBatches.reduce((sum, b) => sum + (b.totalNumbers || 0), 0);
  
  return { totalBatches, totalChecks, validChecks, invalidChecks, todayChecks, monthChecks };
}

// Pagination for results
export async function getHlrResultsByBatchIdPaginated(
  batchId: number, 
  page: number = 1, 
  pageSize: number = 50
): Promise<{ results: HlrResult[]; total: number; pages: number }> {
  const db = await getDb();
  if (!db) return { results: [], total: 0, pages: 0 };
  
  const offset = (page - 1) * pageSize;
  
  const results = await db.select().from(hlrResults)
    .where(eq(hlrResults.batchId, batchId))
    .orderBy(hlrResults.id)
    .limit(pageSize)
    .offset(offset);
  
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(hlrResults)
    .where(eq(hlrResults.batchId, batchId));
  
  const total = countResult[0]?.count || 0;
  const pages = Math.ceil(total / pageSize);
  
  return { results, total, pages };
}

// Get all batches (for admin)
export async function getAllBatches(): Promise<HlrBatch[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(hlrBatches).orderBy(desc(hlrBatches.createdAt));
}

// Get all batches with pagination (for admin)
export async function getAllBatchesPaginated(
  page: number = 1,
  pageSize: number = 20
): Promise<{ batches: HlrBatch[]; total: number; pages: number }> {
  const db = await getDb();
  if (!db) return { batches: [], total: 0, pages: 0 };
  
  const offset = (page - 1) * pageSize;
  
  const batches = await db.select().from(hlrBatches)
    .orderBy(desc(hlrBatches.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(hlrBatches);
  
  const total = countResult[0]?.count || 0;
  const pages = Math.ceil(total / pageSize);
  
  return { batches, total, pages };
}

// Export Templates operations
export async function createExportTemplate(data: {
  userId: number;
  name: string;
  fields: string[];
  isDefault?: "yes" | "no";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If setting as default, unset other defaults for this user
  if (data.isDefault === "yes") {
    await db.update(exportTemplates)
      .set({ isDefault: "no" })
      .where(eq(exportTemplates.userId, data.userId));
  }
  
  const result = await db.insert(exportTemplates).values({
    userId: data.userId,
    name: data.name,
    fields: data.fields,
    isDefault: data.isDefault || "no",
  });
  
  return result[0].insertId;
}

export async function getExportTemplatesByUserId(userId: number): Promise<ExportTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(exportTemplates)
    .where(eq(exportTemplates.userId, userId))
    .orderBy(desc(exportTemplates.createdAt));
}

export async function getExportTemplateById(id: number): Promise<ExportTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(exportTemplates).where(eq(exportTemplates.id, id)).limit(1);
  return result[0];
}

export async function updateExportTemplate(id: number, data: {
  name?: string;
  fields?: string[];
  isDefault?: "yes" | "no";
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const template = await getExportTemplateById(id);
  if (!template) throw new Error("Template not found");
  
  // If setting as default, unset other defaults for this user
  if (data.isDefault === "yes") {
    await db.update(exportTemplates)
      .set({ isDefault: "no" })
      .where(eq(exportTemplates.userId, template.userId));
  }
  
  await db.update(exportTemplates).set(data).where(eq(exportTemplates.id, id));
}

export async function deleteExportTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(exportTemplates).where(eq(exportTemplates.id, id));
}

export async function getDefaultExportTemplate(userId: number): Promise<ExportTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(exportTemplates)
    .where(and(
      eq(exportTemplates.userId, userId),
      eq(exportTemplates.isDefault, "yes")
    ))
    .limit(1);
  
  return result[0];
}

// Health Score calculation
export function calculateHealthScore(result: HlrResult): number {
  let score = 0;
  
  // Validity (40 points)
  if (result.validNumber === "valid") {
    score += 40;
  } else if (result.validNumber === "unknown") {
    score += 20;
  }
  
  // Reachability (25 points)
  if (result.reachable === "reachable") {
    score += 25;
  } else if (result.reachable === "unknown") {
    score += 10;
  }
  
  // Ported status (15 points) - not ported is better for deliverability
  if (result.ported === "not_ported") {
    score += 15;
  } else if (result.ported?.includes("ported")) {
    score += 10; // Ported but still valid
  }
  
  // Roaming status (10 points) - not roaming is better
  if (result.roaming === "not_roaming") {
    score += 10;
  } else if (result.roaming?.includes("roaming")) {
    score += 5;
  }
  
  // Network type (10 points) - mobile is best for SMS
  if (result.currentNetworkType === "mobile") {
    score += 10;
  } else if (result.currentNetworkType === "fixed_line_or_mobile") {
    score += 7;
  } else if (result.currentNetworkType) {
    score += 3;
  }
  
  return Math.min(100, Math.max(0, score));
}

// Classify quality status based on Health Score
// This is separate from validNumber (which comes from API)
export type QualityStatus = "high" | "medium" | "low";

export function classifyQualityByHealthScore(healthScore: number): QualityStatus {
  if (healthScore >= 60) {
    return "high";      // Good for SMS delivery
  } else if (healthScore >= 40) {
    return "medium";    // May have delivery issues
  }
  return "low";         // High risk of delivery failure
}

// Get quality status details for UI display
export function getQualityDetails(healthScore: number): {
  status: QualityStatus;
  label: string;
  description: string;
  color: "green" | "yellow" | "red";
} {
  if (healthScore >= 60) {
    return {
      status: "high",
      label: "Высокое",
      description: "Хорошее качество для SMS-рассылки",
      color: "green",
    };
  } else if (healthScore >= 40) {
    return {
      status: "medium",
      label: "Среднее",
      description: "Возможны проблемы с доставкой",
      color: "yellow",
    };
  }
  return {
    status: "low",
    label: "Низкое",
    description: "Высокий риск недоставки",
    color: "red",
  };
}

// Calculate health scores for batch results
export function calculateBatchHealthScores(results: HlrResult[]): { result: HlrResult; healthScore: number; qualityStatus: QualityStatus }[] {
  return results.map(result => {
    const healthScore = calculateHealthScore(result);
    return {
      result,
      healthScore,
      qualityStatus: classifyQualityByHealthScore(healthScore),
    };
  });
}

// Get phone numbers already checked in a batch (for resume functionality)
export async function getCheckedPhoneNumbersInBatch(batchId: number): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  
  const results = await db.select({ phoneNumber: hlrResults.phoneNumber })
    .from(hlrResults)
    .where(eq(hlrResults.batchId, batchId));
  
  return new Set(results.map(r => r.phoneNumber));
}

// Get incomplete batches for a user (for resume functionality)
export async function getIncompleteBatches(userId: number): Promise<HlrBatch[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(hlrBatches)
    .where(and(
      eq(hlrBatches.userId, userId),
      eq(hlrBatches.status, "processing")
    ))
    .orderBy(desc(hlrBatches.createdAt));
}

// Get all phone numbers from a batch (both checked and unchecked)
export async function getAllPhoneNumbersInBatch(batchId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({ phoneNumber: hlrResults.phoneNumber })
    .from(hlrResults)
    .where(eq(hlrResults.batchId, batchId));
  
  return results.map(r => r.phoneNumber);
}


// Sessions management
import crypto from "crypto";

// Hash token for storage (we don't store raw tokens)
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(data: {
  userId: number;
  token: string;
  deviceInfo?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  expiresAt: Date;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const tokenHash = hashToken(data.token);
  
  const result = await db.insert(sessions).values({
    userId: data.userId,
    tokenHash,
    deviceInfo: data.deviceInfo || null,
    browser: data.browser || null,
    os: data.os || null,
    ipAddress: data.ipAddress || null,
    location: data.location || null,
    isCurrent: "yes",
    expiresAt: data.expiresAt,
  });
  
  return result[0].insertId;
}

export async function getSessionByToken(token: string): Promise<Session | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const tokenHash = hashToken(token);
  const result = await db.select().from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  
  return result[0];
}

export async function getSessionsByUserId(userId: number): Promise<Session[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastActivity));
}

export async function updateSessionActivity(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const tokenHash = hashToken(token);
  await db.update(sessions)
    .set({ lastActivity: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
}

export async function deleteSession(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const tokenHash = hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function deleteAllUserSessions(userId: number, exceptSessionId?: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (exceptSessionId) {
    const result = await db.delete(sessions)
      .where(and(
        eq(sessions.userId, userId),
        sql`${sessions.id} != ${exceptSessionId}`
      ));
    return result[0].affectedRows || 0;
  } else {
    const result = await db.delete(sessions)
      .where(eq(sessions.userId, userId));
    return result[0].affectedRows || 0;
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.delete(sessions)
    .where(sql`${sessions.expiresAt} < NOW()`);
  
  return result[0].affectedRows || 0;
}

export async function getActiveSessionCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(and(
      eq(sessions.userId, userId),
      sql`${sessions.expiresAt} > NOW()`
    ));
  
  return result[0]?.count || 0;
}


// =====================
// Role Permissions
// =====================

import { rolePermissions, RolePermission, InsertRolePermission, Permission, DEFAULT_PERMISSIONS } from "../drizzle/schema";

export async function getRolePermissions(role: string): Promise<Permission[]> {
  const db = await getDb();
  // If no database, return default permissions (for tests)
  if (!db) {
    return DEFAULT_PERMISSIONS[role] || [];
  }
  
  const result = await db.select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role))
    .limit(1);
  
  if (result[0]) {
    return result[0].permissions;
  }
  
  // Return default permissions if no custom permissions set
  return DEFAULT_PERMISSIONS[role] || [];
}

export async function getAllRolePermissions(): Promise<RolePermission[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(rolePermissions).orderBy(rolePermissions.role);
}

export async function setRolePermissions(role: string, permissions: Permission[], description?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if role already exists
  const existing = await db.select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role))
    .limit(1);
  
  if (existing[0]) {
    // Update existing
    await db.update(rolePermissions)
      .set({ permissions, description })
      .where(eq(rolePermissions.role, role));
  } else {
    // Insert new
    await db.insert(rolePermissions).values({
      role,
      permissions,
      description,
    });
  }
}

export async function deleteRolePermissions(role: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(rolePermissions).where(eq(rolePermissions.role, role));
}

// Get effective permissions for a user (considering custom permissions)
export async function getUserEffectivePermissions(userId: number): Promise<Permission[]> {
  const user = await getUserById(userId);
  // If no user found (e.g., in tests without DB), return default user permissions
  if (!user) return DEFAULT_PERMISSIONS['user'] || [];
  
  // If user has custom permissions, use those
  if (user.customPermissions) {
    try {
      return JSON.parse(user.customPermissions) as Permission[];
    } catch {
      // Fall through to role permissions
    }
  }
  
  // Get role permissions
  return await getRolePermissions(user.role);
}

// Check if user has a specific permission
export async function userHasPermission(userId: number, permission: Permission): Promise<boolean> {
  const permissions = await getUserEffectivePermissions(userId);
  return permissions.includes(permission);
}

// Set custom permissions for a user (overrides role permissions)
export async function setUserCustomPermissions(userId: number, permissions: Permission[] | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({ customPermissions: permissions ? JSON.stringify(permissions) : null })
    .where(eq(users.id, userId));
}


// =====================
// Access Requests
// =====================

export async function createAccessRequest(data: {
  name: string;
  telegram?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(accessRequests).values({
    name: data.name,
    telegram: data.telegram || null,
  });
  
  return result[0].insertId;
}

export async function getAccessRequestById(id: number): Promise<AccessRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(accessRequests).where(eq(accessRequests.id, id)).limit(1);
  return result[0];
}

export async function getAccessRequestByEmail(email: string): Promise<AccessRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(accessRequests).where(eq(accessRequests.email, email)).limit(1);
  return result[0];
}

export async function getAllAccessRequests(status?: "pending" | "approved" | "rejected"): Promise<AccessRequest[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (status) {
    return await db.select().from(accessRequests)
      .where(eq(accessRequests.status, status))
      .orderBy(desc(accessRequests.createdAt));
  }
  
  return await db.select().from(accessRequests).orderBy(desc(accessRequests.createdAt));
}

export async function getPendingAccessRequestsCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"));
  
  return result[0]?.count || 0;
}

export async function approveAccessRequest(
  requestId: number, 
  adminId: number, 
  createdUserId: number,
  comment?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(accessRequests)
    .set({
      status: "approved",
      processedBy: adminId,
      processedAt: new Date(),
      createdUserId,
      adminComment: comment || null,
    })
    .where(eq(accessRequests.id, requestId));
}

export async function rejectAccessRequest(
  requestId: number, 
  adminId: number, 
  comment?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(accessRequests)
    .set({
      status: "rejected",
      processedBy: adminId,
      processedAt: new Date(),
      adminComment: comment || null,
    })
    .where(eq(accessRequests.id, requestId));
}

export async function deleteAccessRequest(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(accessRequests).where(eq(accessRequests.id, id));
}


// System Settings operations
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result[0]?.value || null;
}

export async function setSetting(key: string, value: string, description?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Try to update first, if no rows affected then insert
  const updateResult = await db.update(systemSettings)
    .set({ value, updatedAt: new Date() })
    .where(eq(systemSettings.key, key));
  
  if (updateResult[0].affectedRows === 0) {
    await db.insert(systemSettings).values({
      key,
      value,
      description: description || null,
    });
  }
}

export async function getAllSettings(): Promise<SystemSetting[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(systemSettings);
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(systemSettings).where(eq(systemSettings.key, key));
}


// ============================================
// Email Validation Operations
// ============================================

export async function createEmailBatch(data: {
  userId: number;
  name: string;
  totalEmails: number;
  originalEmails?: string[];
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(emailBatches).values({
    userId: data.userId,
    name: data.name,
    totalEmails: data.totalEmails,
    processedEmails: 0,
    validEmails: 0,
    invalidEmails: 0,
    riskyEmails: 0,
    unknownEmails: 0,
    status: "processing",
    originalEmails: data.originalEmails,
  });
  
  return result[0].insertId;
}

export async function updateEmailBatchProgress(
  batchId: number,
  processed: number,
  valid: number,
  invalid: number,
  risky: number,
  unknown: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(emailBatches)
    .set({
      processedEmails: processed,
      validEmails: valid,
      invalidEmails: invalid,
      riskyEmails: risky,
      unknownEmails: unknown,
    })
    .where(eq(emailBatches.id, batchId));
}

export async function completeEmailBatch(batchId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(emailBatches)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(emailBatches.id, batchId));
}

export async function getEmailBatchesByUser(userId: number): Promise<EmailBatch[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(emailBatches)
    .where(eq(emailBatches.userId, userId))
    .orderBy(desc(emailBatches.createdAt));
}

export async function getEmailBatchCountByUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(emailBatches)
    .where(eq(emailBatches.userId, userId));
  
  return result[0]?.count || 0;
}

export async function getEmailBatchById(batchId: number): Promise<EmailBatch | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(emailBatches)
    .where(eq(emailBatches.id, batchId))
    .limit(1);
  
  return results[0] || null;
}

export async function deleteEmailBatch(batchId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete results first
  await db.delete(emailResults).where(eq(emailResults.batchId, batchId));
  // Then delete batch
  await db.delete(emailBatches).where(eq(emailBatches.id, batchId));
}

export async function saveEmailResult(data: {
  batchId: number;
  email: string;
  quality: string;
  result: string;
  resultCode: number;
  subresult: string;
  isFree: boolean;
  isRole: boolean;
  didYouMean: string;
  executionTime: number;
  error?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(emailResults).values({
    batchId: data.batchId,
    email: data.email,
    quality: data.quality,
    result: data.result,
    resultCode: data.resultCode,
    subresult: data.subresult,
    isFree: data.isFree,
    isRole: data.isRole,
    didYouMean: data.didYouMean,
    executionTime: data.executionTime,
    error: data.error || null,
  });
  
  return result[0].insertId;
}

export async function getEmailResultsByBatch(batchId: number): Promise<EmailResult[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(emailResults)
    .where(eq(emailResults.batchId, batchId))
    .orderBy(emailResults.id);
}

// Email cache operations
export async function getEmailFromCache(email: string): Promise<EmailCache | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(emailCache)
    .where(and(
      eq(emailCache.email, email.toLowerCase()),
      gte(emailCache.expiresAt, new Date())
    ))
    .limit(1);
  
  return results[0] || null;
}

export async function saveEmailToCache(data: {
  email: string;
  quality: string;
  result: string;
  resultCode: number;
  subresult: string;
  isFree: boolean;
  isRole: boolean;
  didYouMean: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Cache for 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  try {
    await db.insert(emailCache).values({
      email: data.email.toLowerCase(),
      quality: data.quality,
      result: data.result,
      resultCode: data.resultCode,
      subresult: data.subresult,
      isFree: data.isFree,
      isRole: data.isRole,
      didYouMean: data.didYouMean,
      expiresAt,
    });
  } catch (error) {
    // Ignore duplicate key errors
  }
}

export async function getEmailsFromCacheBulk(emails: string[]): Promise<Map<string, EmailCache>> {
  const db = await getDb();
  if (!db) return new Map();
  
  const lowerEmails = emails.map(e => e.toLowerCase());
  const results = await db.select()
    .from(emailCache)
    .where(and(
      inArray(emailCache.email, lowerEmails),
      gte(emailCache.expiresAt, new Date())
    ));
  
  const cacheMap = new Map<string, EmailCache>();
  for (const result of results) {
    cacheMap.set(result.email.toLowerCase(), result);
  }
  
  return cacheMap;
}

// Get all email batches (for admin)
export async function getAllEmailBatches(): Promise<EmailBatch[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(emailBatches)
    .orderBy(desc(emailBatches.createdAt));
}


// =====================
// Custom Roles
// =====================

export async function createCustomRole(data: {
  name: string;
  description?: string;
  permissions: string[];
  color?: string;
  isSystem?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(customRoles).values({
    name: data.name,
    description: data.description || null,
    permissions: JSON.stringify(data.permissions),
    color: data.color || "#6366f1",
    isSystem: data.isSystem || false,
  });
  
  return result[0].insertId;
}

export async function getAllCustomRoles(): Promise<CustomRole[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(customRoles).orderBy(customRoles.name);
}

export async function getCustomRoleById(id: number): Promise<CustomRole | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(customRoles)
    .where(eq(customRoles.id, id))
    .limit(1);
  
  return results[0] || null;
}

export async function getCustomRoleByName(name: string): Promise<CustomRole | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(customRoles)
    .where(eq(customRoles.name, name))
    .limit(1);
  
  return results[0] || null;
}

export async function updateCustomRole(id: number, data: {
  name?: string;
  description?: string;
  permissions?: string[];
  color?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updates: Partial<InsertCustomRole> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.permissions !== undefined) updates.permissions = JSON.stringify(data.permissions);
  if (data.color !== undefined) updates.color = data.color;
  
  await db.update(customRoles)
    .set(updates)
    .where(eq(customRoles.id, id));
}

export async function deleteCustomRole(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(customRoles).where(eq(customRoles.id, id));
}

export async function initializeSystemRoles(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const systemRoles = [
    { name: "viewer", description: "Can only view history", permissions: ["hlr.history", "email.history"], color: "#94a3b8", isSystem: true },
    { name: "user", description: "Standard user with check permissions", permissions: ["hlr.single", "hlr.batch", "hlr.export", "hlr.history", "email.single", "email.batch", "email.export", "email.history", "tools.duplicates"], color: "#22c55e", isSystem: true },
    { name: "manager", description: "Can manage users and view audit logs", permissions: ["hlr.single", "hlr.batch", "hlr.export", "hlr.history", "hlr.delete", "email.single", "email.batch", "email.export", "email.history", "email.delete", "tools.duplicates", "admin.users", "admin.audit", "admin.sessions"], color: "#f59e0b", isSystem: true },
    { name: "admin", description: "Full access to all features", permissions: ["hlr.single", "hlr.batch", "hlr.export", "hlr.history", "hlr.delete", "email.single", "email.batch", "email.export", "email.history", "email.delete", "tools.duplicates", "admin.users", "admin.users.create", "admin.users.edit", "admin.users.delete", "admin.users.limits", "admin.audit", "admin.sessions", "admin.balance", "admin.settings", "admin.permissions"], color: "#ef4444", isSystem: true },
  ];
  
  for (const role of systemRoles) {
    const existing = await getCustomRoleByName(role.name);
    if (!existing) {
      await createCustomRole(role);
    }
  }
}

// Get incomplete email batches for resume
export async function getIncompleteEmailBatches(userId: number): Promise<EmailBatch[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(emailBatches)
    .where(and(
      eq(emailBatches.userId, userId),
      eq(emailBatches.status, "processing")
    ))
    .orderBy(desc(emailBatches.createdAt));
}

// Get already processed emails for a batch (for resume)
export async function getProcessedEmailsForBatch(batchId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({ email: emailResults.email })
    .from(emailResults)
    .where(eq(emailResults.batchId, batchId));
  
  return results.map(r => r.email);
}
