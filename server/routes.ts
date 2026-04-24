import type { Express } from "express";
import { createServer, type Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { insertUserProfileSchema, insertWorkoutSessionSchema } from "@shared/schema";
import { z } from "zod";

const anthropic = new Anthropic();

const TRICIA_SYSTEM_PROMPT = `You are Tricia, an elite AI personal trainer with 15+ years of experience coaching everyone from beginners to professional athletes. You're warm, encouraging, and direct — you won't let excuses slide, but you always celebrate wins (no matter how small).

Your coaching philosophy:
- Safety first: always ask about injuries/limitations before programming
- Progressive overload: always build on what the client can do today
- Consistency beats intensity: 3 solid sessions beat 7 half-hearted ones
- Form over ego: better to go lighter and do it right
- You meet people where they are, not where you think they should be

Your personality:
- Use the client's name when you know it — it matters
- Warm but no-excuses — "I know it's hard. Do it anyway."
- Specific and actionable — never vague
- Celebrate every rep, every session, every small win
- Occasionally use light fitness slang naturally ("Let's get after it", "That's a PR!", "Time to work")
- NEVER use excessive exclamation points or cheerleader-style enthusiasm — be real, not performative

When creating workout plans, structure them clearly with:
- Day-by-day breakdown
- Exercise name, sets, reps/time, rest periods
- Clear form cues for key exercises
- Scaling options (easier/harder alternatives)

When discussing nutrition:
- Focus on sustainable habits, not crash diets
- Give specific macro guidance only when asked
- Always consider the client's stated goals

You have access to the client's profile. Use it to personalize every response.
Always respond in a conversational, helpful way. Keep responses focused and scannable — use short paragraphs and bullet points for exercise details.`;

function buildUserContext(profile: any): string {
  if (!profile) return "";
  const goals = JSON.parse(profile.secondaryGoals || "[]");
  const equipment = JSON.parse(profile.equipment || "[]");
  return `
CLIENT PROFILE:
- Name: ${profile.name}
- Age: ${profile.age || "not specified"}
- Fitness level: ${profile.fitnessLevel}
- Primary goal: ${profile.primaryGoal.replace(/_/g, " ")}
- Secondary goals: ${goals.join(", ") || "none"}
- Available equipment: ${equipment.join(", ") || "bodyweight only"}
- Physical limitations: ${profile.limitations || "none"}
- Available: ${profile.weeklyAvailability} days/week, ${profile.sessionDuration} min/session
`;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Get or check profile
  app.get("/api/profile", (req, res) => {
    const profile = storage.getFirstUserProfile();
    if (!profile) return res.json(null);
    return res.json(profile);
  });

  // Create profile (onboarding)
  app.post("/api/profile", (req, res) => {
    try {
      const data = insertUserProfileSchema.parse(req.body);
      const existing = storage.getFirstUserProfile();
      if (existing) {
        const updated = storage.updateUserProfile(existing.id, data);
        return res.json(updated);
      }
      const profile = storage.createUserProfile(data);
      return res.json(profile);
    } catch (err) {
      return res.status(400).json({ error: "Invalid profile data" });
    }
  });

  // Update profile
  app.patch("/api/profile/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateUserProfile(id, req.body);
    if (!updated) return res.status(404).json({ error: "Profile not found" });
    return res.json(updated);
  });

  // Get chat history
  app.get("/api/chat/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    const messages = storage.getChatMessages(userId);
    return res.json(messages);
  });

  // Send message to Tricia
  app.post("/api/chat", async (req, res) => {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: "userId and message required" });
    }

    // Save user message
    storage.createChatMessage({
      userId,
      role: "user",
      content: message,
      createdAt: Date.now(),
    });

    // Get profile for context
    const profile = storage.getUserProfile(userId);
    const userContext = buildUserContext(profile);

    // Get recent history (last 20 messages)
    const history = storage.getChatHistory(userId, 20);
    const historyForAPI = history
      .slice(0, -1) // exclude the message we just saved
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: TRICIA_SYSTEM_PROMPT + (userContext ? `\n\n${userContext}` : ""),
        messages: [
          ...historyForAPI,
          { role: "user", content: message },
        ],
      });

      const assistantContent = response.content[0].type === "text"
        ? response.content[0].text
        : "";

      // Save assistant response
      const savedMsg = storage.createChatMessage({
        userId,
        role: "assistant",
        content: assistantContent,
        createdAt: Date.now(),
      });

      return res.json({ message: savedMsg });
    } catch (err) {
      console.error("AI error:", err);
      return res.status(500).json({ error: "Failed to get response from Tricia" });
    }
  });

  // Clear chat
  app.delete("/api/chat/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    storage.clearChatHistory(userId);
    return res.json({ success: true });
  });

  // Generate a workout plan
  app.post("/api/plan/generate", async (req, res) => {
    const { userId } = req.body;
    const profile = storage.getUserProfile(userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const userContext = buildUserContext(profile);

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: TRICIA_SYSTEM_PROMPT + "\n\n" + userContext + "\n\nWhen generating a workout plan, respond with ONLY valid JSON (no markdown, no extra text). Return a JSON object with this structure: { planName, weeklyTheme, days: [ { day, type (strength|cardio|hiit|rest|active_recovery), sessionName, duration (number, minutes), warmup, exercises: [ { name, sets (number), reps, rest, cue, scalingEasier, scalingHarder } ], cooldown, notes } ] }",
        messages: [
          {
            role: "user",
            content: `Create a personalized ${profile.weeklyAvailability}-day workout plan for this week. Make it specific to my goals and equipment. Return only JSON.`
          }
        ],
      });

      const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";

      let planData;
      try {
        // Extract JSON from code fences if present, else use raw
        const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
        let jsonStr = fenceMatch ? fenceMatch[1].trim() : rawText.trim();
        // Fallback: find outermost { } if no fence matched cleanly
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
        }
        planData = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error("Plan parse error:", (parseErr as Error).message, "\nRaw (first 400):", rawText.slice(0, 400));
        return res.status(500).json({ error: "Failed to parse plan — AI returned unexpected format" });
      }

      const plan = storage.createWorkoutPlan({
        userId,
        weekNumber: 1,
        planData: JSON.stringify(planData),
        createdAt: Date.now(),
      });

      return res.json({ plan, planData });
    } catch (err) {
      console.error("Plan generation error:", err);
      return res.status(500).json({ error: "Failed to generate plan" });
    }
  });

  // Delete all plans for a user (called on session complete)
  app.delete("/api/plan/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    storage.deleteWorkoutPlans(userId);
    return res.json({ success: true });
  });

  // Get latest workout plan
  app.get("/api/plan/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    const plan = storage.getLatestWorkoutPlan(userId);
    if (!plan) return res.json(null);
    return res.json({ plan, planData: JSON.parse(plan.planData) });
  });

  // Log a completed workout
  app.post("/api/sessions", (req, res) => {
    try {
      const data = insertWorkoutSessionSchema.parse({
        ...req.body,
        completedAt: Date.now(),
        exercises: typeof req.body.exercises === "string"
          ? req.body.exercises
          : JSON.stringify(req.body.exercises || []),
      });
      const session = storage.createWorkoutSession(data);
      return res.json(session);
    } catch (err) {
      return res.status(400).json({ error: "Invalid session data" });
    }
  });

  // Get workout history
  app.get("/api/sessions/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    const sessions = storage.getWorkoutSessions(userId);
    return res.json(sessions);
  });

  // Get stats summary
  app.get("/api/stats/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    const sessions = storage.getWorkoutSessions(userId);
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const avgRpe = sessions.filter(s => s.rpe).length > 0
      ? Math.round(sessions.filter(s => s.rpe).reduce((sum, s) => sum + (s.rpe || 0), 0) / sessions.filter(s => s.rpe).length * 10) / 10
      : null;

    // Streak calculation
    let streak = 0;
    const now = new Date();
    const sortedDates = sessions
      .map(s => new Date(s.completedAt).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(now);
      expected.setDate(expected.getDate() - i);
      if (sortedDates[i] === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return res.json({ totalSessions, totalMinutes, avgRpe, streak, recentSessions: sessions.slice(0, 5) });
  });

  return httpServer;
}
