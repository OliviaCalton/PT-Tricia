import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import {
  userProfiles, workoutPlans, workoutSessions, chatMessages,
  type UserProfile, type InsertUserProfile,
  type WorkoutPlan, type InsertWorkoutPlan,
  type WorkoutSession, type InsertWorkoutSession,
  type ChatMessage, type InsertChatMessage,
} from "@shared/schema";

// Use persistent disk path on Render, fallback to local for dev
const DB_PATH = process.env.NODE_ENV === "production"
  ? "/opt/render/project/src/pt_tricia.db"
  : "pt_tricia.db";
const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    fitness_level TEXT NOT NULL,
    primary_goal TEXT NOT NULL,
    secondary_goals TEXT NOT NULL DEFAULT '[]',
    equipment TEXT NOT NULL DEFAULT '[]',
    limitations TEXT NOT NULL DEFAULT '',
    weekly_availability INTEGER NOT NULL DEFAULT 3,
    session_duration INTEGER NOT NULL DEFAULT 45,
    onboarding_complete INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS workout_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL DEFAULT 1,
    plan_data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER,
    session_name TEXT NOT NULL,
    exercises TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    duration_minutes INTEGER,
    notes TEXT DEFAULT '',
    rpe INTEGER
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

export interface IStorage {
  // User profiles
  getUserProfile(id: number): UserProfile | undefined;
  getFirstUserProfile(): UserProfile | undefined;
  createUserProfile(data: InsertUserProfile): UserProfile;
  updateUserProfile(id: number, data: Partial<InsertUserProfile>): UserProfile | undefined;

  // Workout plans
  getWorkoutPlan(id: number): WorkoutPlan | undefined;
  getLatestWorkoutPlan(userId: number): WorkoutPlan | undefined;
  getAllWorkoutPlans(userId: number): WorkoutPlan[];
  createWorkoutPlan(data: InsertWorkoutPlan): WorkoutPlan;

  // Workout sessions
  getWorkoutSessions(userId: number): WorkoutSession[];
  createWorkoutSession(data: InsertWorkoutSession): WorkoutSession;
  getRecentSessions(userId: number, limit: number): WorkoutSession[];

  // Chat messages
  getChatMessages(userId: number): ChatMessage[];
  getChatHistory(userId: number, limit: number): ChatMessage[];
  createChatMessage(data: InsertChatMessage): ChatMessage;
  clearChatHistory(userId: number): void;
}

export const storage: IStorage = {
  getUserProfile(id) {
    return db.select().from(userProfiles).where(eq(userProfiles.id, id)).get();
  },
  getFirstUserProfile() {
    return db.select().from(userProfiles).get();
  },
  createUserProfile(data) {
    return db.insert(userProfiles).values(data).returning().get();
  },
  updateUserProfile(id, data) {
    return db.update(userProfiles).set(data).where(eq(userProfiles.id, id)).returning().get();
  },

  getWorkoutPlan(id) {
    return db.select().from(workoutPlans).where(eq(workoutPlans.id, id)).get();
  },
  getLatestWorkoutPlan(userId) {
    return db.select().from(workoutPlans)
      .where(eq(workoutPlans.userId, userId))
      .orderBy(desc(workoutPlans.createdAt))
      .get();
  },
  getAllWorkoutPlans(userId) {
    return db.select().from(workoutPlans)
      .where(eq(workoutPlans.userId, userId))
      .orderBy(desc(workoutPlans.createdAt))
      .all();
  },
  createWorkoutPlan(data) {
    return db.insert(workoutPlans).values(data).returning().get();
  },

  getWorkoutSessions(userId) {
    return db.select().from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.completedAt))
      .all();
  },
  createWorkoutSession(data) {
    return db.insert(workoutSessions).values(data).returning().get();
  },
  getRecentSessions(userId, limit) {
    return db.select().from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.completedAt))
      .limit(limit)
      .all();
  },

  getChatMessages(userId) {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.createdAt)
      .all();
  },
  getChatHistory(userId, limit) {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .all()
      .reverse();
  },
  createChatMessage(data) {
    return db.insert(chatMessages).values(data).returning().get();
  },
  clearChatHistory(userId) {
    db.delete(chatMessages).where(eq(chatMessages.userId, userId)).run();
  },
};
