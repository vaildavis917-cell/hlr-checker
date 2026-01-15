import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, hlrBatches, hlrResults, InsertHlrBatch, InsertHlrResult, HlrBatch, HlrResult, inviteCodes, InsertInviteCode, InviteCode, User } from "../drizzle/schema";
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

export async function verifyPassword(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  if (user.isActive !== "yes") return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  // Update last signed in
  const db = await getDb();
  if (db) {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  }

  return user;
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
