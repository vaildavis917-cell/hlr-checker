import { eq, desc, sql, and, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, hlrBatches, hlrResults, InsertHlrBatch, InsertHlrResult, HlrBatch, HlrResult, inviteCodes, InsertInviteCode, InviteCode, User, actionLogs, InsertActionLog, ActionLog, balanceAlerts, BalanceAlert, exportTemplates, ExportTemplate, InsertExportTemplate } from "../drizzle/schema";
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
  role?: "user" | "admin";
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

export async function updateUserRole(id: number, role: "user" | "admin"): Promise<void> {
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

export async function getActionLogs(userId?: number, limit: number = 100): Promise<ActionLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (userId) {
    return await db.select().from(actionLogs)
      .where(eq(actionLogs.userId, userId))
      .orderBy(desc(actionLogs.createdAt))
      .limit(limit);
  }
  
  return await db.select().from(actionLogs)
    .orderBy(desc(actionLogs.createdAt))
    .limit(limit);
}

// User limits management
export async function checkUserLimits(userId: number, numbersCount: number): Promise<{ allowed: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { allowed: true };
  
  const user = await getUserById(userId);
  if (!user) return { allowed: false, reason: "User not found" };
  
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  
  let checksToday = user.checksToday || 0;
  let checksThisMonth = user.checksThisMonth || 0;
  
  // Reset daily counter if new day
  if (user.lastCheckDate !== today) {
    checksToday = 0;
  }
  
  // Reset monthly counter if new month
  if (user.lastCheckMonth !== thisMonth) {
    checksThisMonth = 0;
  }
  
  // Check daily limit
  if (user.dailyLimit && checksToday + numbersCount > user.dailyLimit) {
    return { allowed: false, reason: `Daily limit exceeded. Used: ${checksToday}/${user.dailyLimit}` };
  }
  
  // Check monthly limit
  if (user.monthlyLimit && checksThisMonth + numbersCount > user.monthlyLimit) {
    return { allowed: false, reason: `Monthly limit exceeded. Used: ${checksThisMonth}/${user.monthlyLimit}` };
  }
  
  return { allowed: true };
}

export async function incrementUserChecks(userId: number, count: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const user = await getUserById(userId);
  if (!user) return;
  
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  
  let checksToday = user.checksToday || 0;
  let checksThisMonth = user.checksThisMonth || 0;
  
  // Reset if new day/month
  if (user.lastCheckDate !== today) {
    checksToday = 0;
  }
  if (user.lastCheckMonth !== thisMonth) {
    checksThisMonth = 0;
  }
  
  await db.update(users).set({
    checksToday: checksToday + count,
    checksThisMonth: checksThisMonth + count,
    lastCheckDate: today,
    lastCheckMonth: thisMonth,
  }).where(eq(users.id, userId));
}

export async function updateUserLimits(userId: number, dailyLimit: number | null, monthlyLimit: number | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ dailyLimit, monthlyLimit }).where(eq(users.id, userId));
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

// Calculate health scores for batch results
export function calculateBatchHealthScores(results: HlrResult[]): { result: HlrResult; healthScore: number }[] {
  return results.map(result => ({
    result,
    healthScore: calculateHealthScore(result),
  }));
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
