import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const STEPS = [
  "welcome",
  "basics",
  "goals",
  "equipment",
  "schedule",
  "limitations",
  "done",
];

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Lose Weight", icon: "🔥" },
  { value: "build_muscle", label: "Build Muscle", icon: "💪" },
  { value: "improve_endurance", label: "Endurance", icon: "🏃" },
  { value: "increase_flexibility", label: "Flexibility", icon: "🧘" },
  { value: "general_fitness", label: "General Fitness", icon: "⚡" },
];

const EQUIPMENT_OPTIONS = [
  { value: "none", label: "No Equipment" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "barbell", label: "Barbell + Rack" },
  { value: "resistance_bands", label: "Resistance Bands" },
  { value: "pull_up_bar", label: "Pull-up Bar" },
  { value: "kettlebell", label: "Kettlebells" },
  { value: "full_gym", label: "Full Gym Access" },
];

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner", desc: "New to training or returning after a long break" },
  { value: "intermediate", label: "Intermediate", desc: "Training consistently for 6+ months" },
  { value: "advanced", label: "Advanced", desc: "Training seriously for 2+ years" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "prefer_not_to_say",
    fitnessLevel: "",
    primaryGoal: "",
    secondaryGoals: [] as string[],
    equipment: [] as string[],
    limitations: "",
    weeklyAvailability: 3,
    sessionDuration: 45,
    onboardingComplete: true,
  });

  const queryClient = useQueryClient();

  const createProfile = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        age: data.age ? parseInt(data.age) : null,
        secondaryGoals: JSON.stringify(data.secondaryGoals),
        equipment: JSON.stringify(data.equipment),
      };
      const res = await apiRequest("POST", "/api/profile", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const currentStep = STEPS[step];
  const progress = (step / (STEPS.length - 1)) * 100;

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const toggleArrayItem = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleFinish = () => {
    createProfile.mutate(form);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg)",
        maxWidth: "448px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ padding: "1.5rem 1.5rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.5rem" }}>
          <svg viewBox="0 0 36 36" width="32" height="32" fill="none">
            <circle cx="18" cy="18" r="17" fill="#f86800" fillOpacity="0.12" stroke="#f86800" strokeWidth="1.5"/>
            <text x="18" y="24" textAnchor="middle" fontFamily="Barlow Condensed, Impact, sans-serif" fontWeight="800" fontSize="16" fill="#f86800">T</text>
            <path d="M10 26 Q18 20 26 26" stroke="#f86800" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          <span className="tricia-logo">PT Tricia</span>
        </div>
        {step > 0 && step < STEPS.length - 1 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Step {step} of {STEPS.length - 2}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "1rem 1.5rem 2rem", overflowY: "auto" }} className="onboarding-step">
        {currentStep === "welcome" && (
          <WelcomeStep onNext={next} />
        )}
        {currentStep === "basics" && (
          <BasicsStep form={form} setForm={setForm} onNext={next} onBack={back} />
        )}
        {currentStep === "goals" && (
          <GoalsStep form={form} setForm={setForm} onNext={next} onBack={back} toggleArrayItem={toggleArrayItem} />
        )}
        {currentStep === "equipment" && (
          <EquipmentStep form={form} setForm={setForm} onNext={next} onBack={back} toggleArrayItem={toggleArrayItem} />
        )}
        {currentStep === "schedule" && (
          <ScheduleStep form={form} setForm={setForm} onNext={next} onBack={back} />
        )}
        {currentStep === "limitations" && (
          <LimitationsStep form={form} setForm={setForm} onNext={next} onBack={back} />
        )}
        {currentStep === "done" && (
          <DoneStep name={form.name} onFinish={handleFinish} isLoading={createProfile.isPending} />
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "2.5rem", color: "var(--color-orange)", marginBottom: "0.5rem" }}>
          Let's Get to Work
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", lineHeight: 1.7 }}>
          I'm Tricia — your AI personal trainer. I'll build custom workouts around your goals, coach you through every session, and push you when you need it.
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", marginTop: "0.75rem", lineHeight: 1.7 }}>
          No fluff. No cookie-cutter plans. Just training built for you.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {[
          { icon: "⚡", text: "Custom weekly workout plans" },
          { icon: "💬", text: "Real coaching, on demand" },
          { icon: "📈", text: "Progress tracking & streaks" },
          { icon: "🎯", text: "Adapts to your schedule & equipment" },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem", background: "var(--color-surface)", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: "0.9375rem", color: "var(--color-text)" }}>{text}</span>
          </div>
        ))}
      </div>

      <button className="btn-orange" onClick={onNext} style={{ width: "100%", justifyContent: "center", padding: "0.875rem" }} data-testid="button-start">
        Let's Build Your Program
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}

function BasicsStep({ form, setForm, onNext, onBack }: any) {
  const valid = form.name.trim() && form.fitnessLevel;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "0.375rem" }}>First, the basics</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>Tell me a bit about yourself.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Your Name</label>
          <input
            type="text"
            placeholder="What should I call you?"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            data-testid="input-name"
            style={{ width: "100%", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "0.75rem 1rem", color: "var(--color-text)", fontSize: "1rem", outline: "none", transition: "border-color 0.15s" }}
            onFocus={e => (e.target.style.borderColor = "var(--color-orange)")}
            onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Age (optional)</label>
          <input
            type="number"
            placeholder="Your age"
            value={form.age}
            onChange={e => setForm({ ...form, age: e.target.value })}
            data-testid="input-age"
            style={{ width: "100%", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "0.75rem 1rem", color: "var(--color-text)", fontSize: "1rem", outline: "none" }}
            onFocus={e => (e.target.style.borderColor = "var(--color-orange)")}
            onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: "0.625rem" }}>Experience Level</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {LEVEL_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setForm({ ...form, fitnessLevel: value })}
                data-testid={`button-level-${value}`}
                style={{
                  textAlign: "left",
                  padding: "0.875rem 1rem",
                  borderRadius: "10px",
                  border: form.fitnessLevel === value ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
                  background: form.fitnessLevel === value ? "var(--color-orange-subtle)" : "var(--color-surface)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: form.fitnessLevel === value ? "var(--color-orange)" : "var(--color-text)" }}>{label}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" onClick={onBack} style={{ flex: 0 }} data-testid="button-back">Back</button>
        <button className="btn-orange" onClick={onNext} disabled={!valid} style={{ flex: 1, justifyContent: "center", opacity: valid ? 1 : 0.4 }} data-testid="button-next">Continue</button>
      </div>
    </div>
  );
}

function GoalsStep({ form, setForm, onNext, onBack, toggleArrayItem }: any) {
  const valid = form.primaryGoal;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "0.375rem" }}>What's your goal?</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>Pick your primary focus. I'll build everything around it.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {GOAL_OPTIONS.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setForm({ ...form, primaryGoal: value })}
            data-testid={`button-goal-${value}`}
            style={{
              textAlign: "left",
              padding: "1rem 1.125rem",
              borderRadius: "12px",
              border: form.primaryGoal === value ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
              background: form.primaryGoal === value ? "var(--color-orange-subtle)" : "var(--color-surface)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{icon}</span>
            <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: form.primaryGoal === value ? "var(--color-orange)" : "var(--color-text)" }}>{label}</span>
            {form.primaryGoal === value && (
              <svg style={{ marginLeft: "auto", color: "var(--color-orange)" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" onClick={onBack} data-testid="button-back">Back</button>
        <button className="btn-orange" onClick={onNext} disabled={!valid} style={{ flex: 1, justifyContent: "center", opacity: valid ? 1 : 0.4 }} data-testid="button-next">Continue</button>
      </div>
    </div>
  );
}

function EquipmentStep({ form, setForm, onNext, onBack, toggleArrayItem }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "0.375rem" }}>Your equipment</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>Select everything you have access to. I'll work with what you've got.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
        {EQUIPMENT_OPTIONS.map(({ value, label }) => {
          const selected = form.equipment.includes(value);
          return (
            <button
              key={value}
              onClick={() => {
                let newEquip = toggleArrayItem(form.equipment, value);
                if (value === "none") {
                  newEquip = selected ? [] : ["none"];
                } else {
                  newEquip = newEquip.filter((x: string) => x !== "none");
                }
                setForm({ ...form, equipment: newEquip });
              }}
              data-testid={`button-equipment-${value}`}
              style={{
                padding: "0.875rem 0.75rem",
                borderRadius: "10px",
                border: selected ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
                background: selected ? "var(--color-orange-subtle)" : "var(--color-surface)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: selected ? 600 : 500,
                color: selected ? "var(--color-orange)" : "var(--color-text)",
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" onClick={onBack} data-testid="button-back">Back</button>
        <button className="btn-orange" onClick={onNext} style={{ flex: 1, justifyContent: "center" }} data-testid="button-next">Continue</button>
      </div>
    </div>
  );
}

function ScheduleStep({ form, setForm, onNext, onBack }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "0.375rem" }}>Your schedule</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>I'll fit into your life — not the other way around.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: "0.875rem" }}>
            Days per week: <span style={{ color: "var(--color-orange)", fontSize: "1rem" }}>{form.weeklyAvailability}</span>
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setForm({ ...form, weeklyAvailability: n })}
                data-testid={`button-days-${n}`}
                style={{
                  flex: 1,
                  padding: "0.75rem 0.5rem",
                  borderRadius: "10px",
                  border: form.weeklyAvailability === n ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
                  background: form.weeklyAvailability === n ? "var(--color-orange-subtle)" : "var(--color-surface)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: form.weeklyAvailability === n ? "var(--color-orange)" : "var(--color-text-muted)",
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
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: "0.875rem" }}>
            Session length: <span style={{ color: "var(--color-orange)", fontSize: "1rem" }}>{form.sessionDuration} min</span>
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[20, 30, 45, 60, 90].map(n => (
              <button
                key={n}
                onClick={() => setForm({ ...form, sessionDuration: n })}
                data-testid={`button-duration-${n}`}
                style={{
                  flex: 1,
                  padding: "0.625rem 0.25rem",
                  borderRadius: "10px",
                  border: form.sessionDuration === n ? "2px solid var(--color-orange)" : "1px solid var(--color-border)",
                  background: form.sessionDuration === n ? "var(--color-orange-subtle)" : "var(--color-surface)",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  color: form.sessionDuration === n ? "var(--color-orange)" : "var(--color-text-muted)",
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

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" onClick={onBack} data-testid="button-back">Back</button>
        <button className="btn-orange" onClick={onNext} style={{ flex: 1, justifyContent: "center" }} data-testid="button-next">Continue</button>
      </div>
    </div>
  );
}

function LimitationsStep({ form, setForm, onNext, onBack }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "0.375rem" }}>Injuries or limitations?</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>Safety is non-negotiable. Tell me anything I need to work around.</p>
      </div>

      <textarea
        placeholder="e.g. Lower back issues, bad left knee, shoulder impingement... or just leave blank if you're all good."
        value={form.limitations}
        onChange={e => setForm({ ...form, limitations: e.target.value })}
        data-testid="input-limitations"
        rows={4}
        style={{
          width: "100%",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
          padding: "0.875rem 1rem",
          color: "var(--color-text)",
          fontSize: "1rem",
          outline: "none",
          resize: "none",
          lineHeight: 1.6,
        }}
        onFocus={e => (e.target.style.borderColor = "var(--color-orange)")}
        onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
      />

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" onClick={onBack} data-testid="button-back">Back</button>
        <button className="btn-orange" onClick={onNext} style={{ flex: 1, justifyContent: "center" }} data-testid="button-next">Almost Done</button>
      </div>
    </div>
  );
}

function DoneStep({ name, onFinish, isLoading }: { name: string; onFinish: () => void; isLoading: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem", paddingTop: "1.5rem" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, var(--color-orange), #ff4d00)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0a0b0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <div>
        <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          {name ? `Ready, ${name}!` : "You're all set!"}
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", lineHeight: 1.7 }}>
          I've got everything I need. Time to build your program and start making progress. Let's get after it.
        </p>
      </div>

      <button
        className="btn-orange"
        onClick={onFinish}
        disabled={isLoading}
        data-testid="button-finish"
        style={{ width: "100%", justifyContent: "center", padding: "0.875rem", fontSize: "1rem", opacity: isLoading ? 0.6 : 1 }}
      >
        {isLoading ? "Setting up your profile..." : "Start Training"}
        {!isLoading && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
      </button>
    </div>
  );
}
