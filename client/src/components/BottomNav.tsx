import { useHashLocation } from "wouter/use-hash-location";

const navItems = [
  {
    href: "/chat",
    label: "Coach",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/workout",
    label: "Training",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16M18 4v16M6 8H2M6 16H2M22 8h-4M22 16h-4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Progress",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const [location, navigate] = useHashLocation();
  const currentPath = location === "/" ? "/chat" : location;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "448px",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        padding: "0.5rem 1rem",
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
        zIndex: 50,
        display: "flex",
        gap: "0.25rem",
      }}
    >
      {navItems.map(({ href, label, icon }) => {
        const active = currentPath === href;
        return (
          <button
            key={href}
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(href)}
            data-testid={`nav-${label.toLowerCase()}`}
          >
            {icon(active)}
            {label}
          </button>
        );
      })}
    </nav>
  );
}
