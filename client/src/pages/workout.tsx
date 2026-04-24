import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile } from "@shared/schema";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  cue: string;
  scalingEasier?: string;
  scalingHarder?: string;
}

interface WorkoutDay {
  day: string;
  type: string;
  sessionName: string;
  duration: number;
  warmup: string;
  exercises: Exercise[];
  cooldown: string;
  notes: string;
}

interface PlanData {
  planName: string;
  weeklyTheme: string;
  days: WorkoutDay[];
}

const TYPE_COLORS: Record<string, string> = {
  strength: "var(--color-orange)",
  cardio: "#3b82f6",
  hiit: "#a855f7",
  rest: "var(--color-text-muted)",
  active_recovery: "#22c55e",
};

const TYPE_LABELS: Record<string, string> = {
  strength: "Strength",
  cardio: "Cardio",
  hiit: "HIIT",
  rest: "Rest Day",
  active_recovery: "Active Recovery",
};

export default function WorkoutPage() {
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logData, setLogData] = useState({ duration: "", rpe: "", notes: "" });
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: () => apiRequest("GET", "/api/profile").then(r => r.json()),
  });

  const { data: planResult, isLoading: loadingPlan } = useQuery<{ plan: any; planData: PlanData } | null>({
    queryKey: ["/api/plan", profile?.id],
    queryFn: () => apiRequest("GET", `/api/plan/${profile!.id}`).then(r => r.json()),
    enabled: !!profile?.id,
  });

  const generatePlan = useMutation({
    mutationFn: () => apiRequest("POST", "/api/plan/generate", { userId: profile!.id }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/plan", profile?.id] }),
  });

  const logSession = useMutation({
    mutationFn: async (day: WorkoutDay) => {
      // Log the session
      const session = await apiRequest("POST", "/api/sessions", {
        userId: profile!.id,
        sessionName: day.sessionName,
        exercises: day.exercises,
        durationMinutes: logData.duration ? parseInt(logData.duration) : day.duration,
        rpe: logData.rpe ? parseInt(logData.rpe) : null,
        notes: logData.notes,
      }).then(r => r.json());
      // Clear chat history AND workout plan so everything starts fresh
      await apiRequest("DELETE", `/api/chat/${profile!.id}`);
      await apiRequest("DELETE", `/api/plan/${profile!.id}`);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan", profile?.id] });
      setLogOpen(false);
      setSelectedDay(null);
      setLogData({ duration: "", rpe: "", notes: "" });
    },
  });

  const planData = planResult?.planData;

  if (selectedDay) {
    return (
      <SessionView
        day={selectedDay}
        onBack={() => setSelectedDay(null)}
        onLog={() => setLogOpen(true)}
        logOpen={logOpen}
        logData={logData}
        setLogData={setLogData}
        onSubmitLog={() => logSession.mutate(selectedDay)}
        isLogging={logSession.isPending}
        onCloseLog={() => setLogOpen(false)}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: "72px" }}>
      {/* Header */}
      <div style={{
        padding: "1.25rem 1.25rem 1rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", color: "var(--color-text)", marginBottom: "0.25rem" }}>This Week</h1>
            {planData && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{planData.weeklyTheme}</p>}
          </div>
          <button
            className="btn-orange"
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
            data-testid="button-generate-plan"
            style={{ fontSize: "0.8125rem", padding: "0.5rem 0.875rem" }}
          >
            {generatePlan.isPending ? (
              <>
                <div className="typing-dot" style={{ background: "#0a0b0d" }} />
                <span>Building...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                {planData ? "New Plan" : "Generate Plan"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {(loadingPlan || generatePlan.isPending) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="shimmer" style={{ height: "90px", borderRadius: "12px" }} />
            ))}
          </div>
        )}

        {!loadingPlan && !generatePlan.isPending && !planData && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "3rem 1.5rem", gap: "1.25rem" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 8H2M6 16H2M22 8h-4M22 16h-4"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "var(--color-text)", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>No Plan Yet</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", maxWidth: "30ch", margin: "0 auto" }}>Let me build your first personalized training week.</p>
            </div>
            <button
              className="btn-orange"
              onClick={() => generatePlan.mutate()}
              data-testid="button-generate-first"
              style={{ padding: "0.875rem 2rem" }}
            >
              Build My Plan
            </button>
          </div>
        )}

        {!loadingPlan && !generatePlan.isPending && planData && (
          <>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>
              {planData.planName}
            </div>
            {planData.days.map((day, i) => (
              <DayCard
                key={i}
                day={day}
                onClick={() => day.type !== "rest" && setSelectedDay(day)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function DayCard({ day, onClick }: { day: WorkoutDay; onClick: () => void }) {
  const color = TYPE_COLORS[day.type] || "var(--color-text-muted)";
  const isRest = day.type === "rest";

  return (
    <div
      className={`workout-day-card ${isRest ? "rest" : ""}`}
      onClick={onClick}
      data-testid={`card-day-${day.day.toLowerCase()}`}
      style={{ cursor: isRest ? "default" : "pointer" }}
    >
      <div style={{ padding: "1rem 1.125rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{
          minWidth: "48px",
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          lineHeight: 1.1,
        }}>
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
            {day.day.slice(0, 3)}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {day.sessionName}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem", flexWrap: "wrap" }}>
            <span className="badge" style={{
              background: `${color}18`,
              color,
              border: `1px solid ${color}30`,
              fontSize: "0.625rem",
              fontWeight: 700,
              padding: "0.15rem 0.5rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              {TYPE_LABELS[day.type] || day.type}
            </span>
            {!isRest && (
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {day.duration} min · {day.exercises?.length || 0} exercises
              </span>
            )}
          </div>
        </div>

        {!isRest && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        )}
      </div>
    </div>
  );
}

function SessionView({ day, onBack, onLog, logOpen, logData, setLogData, onSubmitLog, isLogging, onCloseLog }: any) {
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: "72px" }}>
      {/* Header */}
      <div style={{
        padding: "1rem 1.25rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
          <button onClick={onBack} data-testid="button-back" style={{ padding: "0.375rem", borderRadius: "8px", border: "none", background: "var(--color-surface-2)", color: "var(--color-text-muted)", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{day.day}</div>
            <h2 style={{ fontSize: "1.25rem", color: "var(--color-text)" }}>{day.sessionName}</h2>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>⏱ {day.duration} min</span>
          <span style={{ color: "var(--color-border)" }}>·</span>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{day.exercises.length} exercises</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Warmup */}
        <section>
          <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-orange)", fontWeight: 700, marginBottom: "0.5rem" }}>Warm-up</div>
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", background: "var(--color-surface)", borderRadius: "10px", padding: "0.875rem 1rem", border: "1px solid var(--color-border)" }}>
            {day.warmup}
          </p>
        </section>

        {/* Exercises */}
        <section>
          <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-orange)", fontWeight: 700, marginBottom: "0.625rem" }}>
            Exercises
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {day.exercises.map((ex: Exercise, i: number) => (
              <ExerciseCard
                key={i}
                exercise={ex}
                index={i + 1}
                expanded={expandedExercise === i}
                onToggle={() => setExpandedExercise(expandedExercise === i ? null : i)}
              />
            ))}
          </div>
        </section>

        {/* Cooldown */}
        <section>
          <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-orange)", fontWeight: 700, marginBottom: "0.5rem" }}>Cool-down</div>
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", background: "var(--color-surface)", borderRadius: "10px", padding: "0.875rem 1rem", border: "1px solid var(--color-border)" }}>
            {day.cooldown}
          </p>
        </section>

        {/* Tricia note */}
        {day.notes && (
          <div style={{ display: "flex", gap: "0.75rem", background: "var(--color-orange-subtle)", borderRadius: "12px", padding: "0.875rem 1rem", border: "1px solid rgba(248,104,0,0.2)" }}>
            <div className="tricia-avatar" style={{ width: "28px", height: "28px", fontSize: "0.75rem", flexShrink: 0 }}>T</div>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text)", fontStyle: "italic" }}>{day.notes}</p>
          </div>
        )}

        {/* Log button */}
        <button
          className="btn-orange"
          onClick={onLog}
          data-testid="button-log-session"
          style={{ width: "100%", justifyContent: "center", padding: "0.875rem", fontSize: "0.9375rem" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Log This Session
        </button>
      </div>

      {/* Log modal */}
      {logOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "flex-end",
          backdropFilter: "blur(4px)",
        }} onClick={onCloseLog}>
          <div
            style={{ width: "100%", maxWidth: "448px", margin: "0 auto", background: "var(--color-surface)", borderRadius: "20px 20px 0 0", padding: "1.5rem", borderTop: "1px solid var(--color-border)" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}>Log Session</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>Duration (minutes)</label>
                <input
                  type="number"
                  placeholder={String(day.duration)}
                  value={logData.duration}
                  onChange={e => setLogData({ ...logData, duration: e.target.value })}
                  data-testid="input-duration"
                  style={{ width: "100%", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.625rem 0.875rem", color: "var(--color-text)", fontSize: "1rem", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
                  Effort (RPE 1–10) — how hard was it?
                </label>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  {[...Array(10)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setLogData({ ...logData, rpe: String(i + 1) })}
                      data-testid={`button-rpe-${i+1}`}
                      style={{
                        flex: 1,
                        padding: "0.5rem 0",
                        borderRadius: "6px",
                        border: logData.rpe === String(i + 1) ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
                        background: logData.rpe === String(i + 1) ? "var(--color-orange-subtle)" : "var(--color-surface-2)",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: logData.rpe === String(i + 1) ? "var(--color-orange)" : "var(--color-text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>Notes (optional)</label>
                <textarea
                  placeholder="How did it go? Any PRs?"
                  value={logData.notes}
                  onChange={e => setLogData({ ...logData, notes: e.target.value })}
                  rows={3}
                  data-testid="input-session-notes"
                  style={{ width: "100%", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.625rem 0.875rem", color: "var(--color-text)", fontSize: "0.9375rem", outline: "none", resize: "none" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button className="btn-ghost" onClick={onCloseLog} data-testid="button-cancel-log">Cancel</button>
              <button
                className="btn-orange"
                onClick={onSubmitLog}
                disabled={isLogging}
                data-testid="button-submit-log"
                style={{ flex: 1, justifyContent: "center" }}
              >
                {isLogging ? "Saving..." : "Save Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, index, expanded, onToggle }: { exercise: Exercise; index: number; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      className="workout-day-card"
      data-testid={`card-exercise-${index}`}
      style={{ overflow: "hidden" }}
    >
      <button
        onClick={onToggle}
        style={{ width: "100%", background: "none", border: "none", padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.875rem", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          background: "var(--color-orange-subtle)",
          border: "1px solid rgba(248,104,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.75rem",
          color: "var(--color-orange)", flexShrink: 0,
        }}>
          {index}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text)" }}>{exercise.name}</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
            {exercise.sets} sets · {exercise.reps} · Rest: {exercise.rest}
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ height: "1px", background: "var(--color-border)" }} />
          {exercise.cue && (
            <div>
              <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-orange)", fontWeight: 700, marginBottom: "0.25rem" }}>Form Cue</div>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{exercise.cue}</p>
            </div>
          )}
          {(exercise.scalingEasier || exercise.scalingHarder) && (
            <div style={{ display: "flex", gap: "0.625rem" }}>
              {exercise.scalingEasier && (
                <div style={{ flex: 1, background: "var(--color-surface-2)", borderRadius: "8px", padding: "0.625rem" }}>
                  <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-success)", fontWeight: 700, marginBottom: "0.25rem" }}>Easier</div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{exercise.scalingEasier}</p>
                </div>
              )}
              {exercise.scalingHarder && (
                <div style={{ flex: 1, background: "var(--color-surface-2)", borderRadius: "8px", padding: "0.625rem" }}>
                  <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-orange)", fontWeight: 700, marginBottom: "0.25rem" }}>Harder</div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{exercise.scalingHarder}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
