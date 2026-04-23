import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./lib/queryClient";

import OnboardingPage from "./pages/onboarding";
import ChatPage from "./pages/chat";
import WorkoutPage from "./pages/workout";
import DashboardPage from "./pages/dashboard";
import BottomNav from "./components/BottomNav";

function AppContent() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: () => apiRequest("GET", "/api/profile").then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <TriciaLogo />
          <div className="flex gap-2">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        </div>
      </div>
    );
  }

  const isOnboarded = profile && profile.onboardingComplete;

  if (!isOnboarded) {
    return <OnboardingPage />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative">
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={ChatPage} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/workout" component={WorkoutPage} />
          <Route path="/dashboard" component={DashboardPage} />
        </Switch>
      </Router>
      <BottomNav />
    </div>
  );
}

function TriciaLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg aria-label="PT Tricia logo" viewBox="0 0 36 36" width="36" height="36" fill="none">
        <circle cx="18" cy="18" r="17" fill="#f86800" fillOpacity="0.12" stroke="#f86800" strokeWidth="1.5"/>
        <text x="18" y="24" textAnchor="middle" fontFamily="Barlow Condensed, Impact, sans-serif" fontWeight="800" fontSize="16" fill="#f86800">T</text>
        <path d="M10 26 Q18 20 26 26" stroke="#f86800" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
      <span className="tricia-logo">PT Tricia</span>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}
