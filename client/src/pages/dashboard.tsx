import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile, WorkoutSession } from "@shared/schema";

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Weight Loss",
  build_muscle: "Build Muscle",
  improve_endurance: "Endurance",
  increase_flexibility: "Flexibility",
  general_fitness: "General Fitness",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: () => apiRequest("GET", "/api/profile").then(r => r.json()),
  });

  const { data: stats } = useQuery<{
    totalSessions: number;
    totalMinutes: number;
    avgRpe: number | null;
    streak: number;
    recentSessions: WorkoutSession[];
  }>({
    queryKey: ["/api/stats", profile?.id],
    queryFn: () => apiRequest("GET", `/api/stats/${profile!.id}`).then(r => r.json()),
    enabled: !!profile?.id,
  });

  const updateProfile = useMutation({
    mutationFn: (data: Partial<UserProfile>) =>
      apiRequest("PATCH", `/api/profile/${profile!.id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const equipment = profile ? JSON.parse(profile.equipment || "[]") : [];
  const hours = stats ? Math.floor(stats.totalMinutes / 60) : 0;
  const mins = stats ? stats.totalMinutes % 60 : 0;

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: "72px" }}>
      {/* Header */}
      <div style={{
        padding: "1.25rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <h1 style={{ fontSize: "1.5rem", color: "var(--color-text)" }}>Progress</h1>
      </div>

      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Profile card */}
        {profile && (
          <div className="card-athletic" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--color-orange), #ff4d00)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", color: "#0a0b0d",
              }}>
                {profile.name[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--color-text)" }}>{profile.name}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  {LEVEL_LABELS[profile.fitnessLevel]} · {profile.weeklyAvailability}x/week
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="badge badge-orange">{GOAL_LABELS[profile.primaryGoal]}</span>
              {equipment.map((eq: string) => (
                <span key={eq} className="badge badge-muted">{eq.replace(/_/g, " ")}</span>
              ))}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: "0.75rem", fontWeight: 600 }}>
            Your Numbers
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
            <div className="stat-card">
              <div className="stat-value" data-testid="stat-sessions">{stats?.totalSessions ?? 0}</div>
              <div className="stat-label">Sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" data-testid="stat-streak">
                {stats?.streak ?? 0}
                <span style={{ fontSize: "1rem", marginLeft: "0.125rem" }}>🔥</span>
              </div>
              <div className="stat-label">Day Streak</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" data-testid="stat-hours">
                {hours}
                <span style={{ fontSize: "1.25rem", fontWeight: 400, color: "var(--color-text-muted)" }}>h {mins}m</span>
              </div>
              <div className="stat-label">Total Time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" data-testid="stat-rpe">
                {stats?.avgRpe ?? "—"}
              </div>
              <div className="stat-label">Avg RPE</div>
            </div>
          </div>
        </div>

        {/* Recent sessions */}
        <div>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: "0.75rem", fontWeight: 600 }}>
            Recent Sessions
          </div>
          {stats?.recentSessions && stats.recentSessions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {stats.recentSessions.map(session => (
                <div
                  key={session.id}
                  className="card-athletic"
                  data-testid={`card-session-${session.id}`}
                  style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.875rem" }}
                >
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: "var(--color-orange-subtle)",
                    border: "1px solid rgba(248,104,0,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange)" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 4v16M18 4v16M6 8H2M6 16H2M22 8h-4M22 16h-4"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {session.sessionName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                      {session.durationMinutes ? `${session.durationMinutes} min` : "—"}
                      {session.rpe && ` · RPE ${session.rpe}`}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", flexShrink: 0 }}>
                    {timeAgo(session.completedAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "2rem 1.5rem", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: "0.75rem" }}>
                <path d="M6 4v16M18 4v16M6 8H2M6 16H2M22 8h-4M22 16h-4"/>
              </svg>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No sessions logged yet. Complete a workout to see your history.</p>
            </div>
          )}
        </div>

        {/* Profile settings */}
        {profile && (
          <div className="card-athletic" style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: "1rem", fontWeight: 600 }}>
              Training Settings
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                  Days per week: <strong style={{ color: "var(--color-orange)" }}>{profile.weeklyAvailability}</strong>
                </label>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  {[2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      onClick={() => updateProfile.mutate({ weeklyAvailability: n })}
                      data-testid={`button-days-${n}`}
                      style={{
                        flex: 1, padding: "0.5rem",
                        borderRadius: "8px",
                        border: profile.weeklyAvailability === n ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
                        background: profile.weeklyAvailability === n ? "var(--color-orange-subtle)" : "transparent",
                        fontWeight: 700, fontSize: "0.875rem",
                        color: profile.weeklyAvailability === n ? "var(--color-orange)" : "var(--color-text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                  Session length: <strong style={{ color: "var(--color-orange)" }}>{profile.sessionDuration} min</strong>
                </label>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  {[20, 30, 45, 60, 90].map(n => (
                    <button
                      key={n}
                      onClick={() => updateProfile.mutate({ sessionDuration: n })}
                      data-testid={`button-duration-${n}`}
                      style={{
                        flex: 1, padding: "0.5rem 0.125rem",
                        borderRadius: "8px",
                        border: profile.sessionDuration === n ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
                        background: profile.sessionDuration === n ? "var(--color-orange-subtle)" : "transparent",
                        fontWeight: 700, fontSize: "0.6875rem",
                        color: profile.sessionDuration === n ? "var(--color-orange)" : "var(--color-text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
