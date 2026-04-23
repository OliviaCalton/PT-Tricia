import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage, UserProfile } from "@shared/schema";

function formatContent(text: string) {
  // Simple markdown-ish formatting
  const lines = text.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push("<br>");
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${formatInline(trimmed.slice(2))}</li>`);
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h4>${trimmed.slice(2, -2)}</h4>`);
    } else if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      const heading = trimmed.replace(/^#{2,3}\s/, "");
      result.push(`<h3>${heading}</h3>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<p>${formatInline(trimmed)}</p>`);
    }
  }
  if (inList) result.push("</ul>");
  return result.join("");
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

const QUICK_PROMPTS = [
  "Generate my workout plan",
  "I need a quick 20-min workout",
  "How's my form on squats?",
  "What should I eat today?",
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: () => apiRequest("GET", "/api/profile").then(r => r.json()),
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", profile?.id],
    queryFn: () => apiRequest("GET", `/api/chat/${profile!.id}`).then(r => r.json()),
    enabled: !!profile?.id,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat", { userId: profile!.id, message: content });
      return res.json();
    },
    onMutate: async (content) => {
      // Optimistic update — add user msg immediately
      await queryClient.cancelQueries({ queryKey: ["/api/chat", profile?.id] });
      const prev = queryClient.getQueryData<ChatMessage[]>(["/api/chat", profile?.id]) || [];
      const optimistic: ChatMessage = {
        id: Date.now(),
        userId: profile!.id,
        role: "user",
        content,
        createdAt: Date.now(),
      };
      queryClient.setQueryData(["/api/chat", profile?.id], [...prev, optimistic]);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["/api/chat", profile?.id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", profile?.id] });
    },
  });

  const clearChat = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/chat/${profile!.id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat", profile?.id] }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    setInput("");
    sendMessage.mutate(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isTyping = sendMessage.isPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: "72px" }}>
      {/* Header */}
      <div style={{
        padding: "1rem 1.25rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ position: "relative" }}>
            <div className="tricia-avatar" style={{ width: "40px", height: "40px", fontSize: "1rem" }}>T</div>
            <div style={{
              position: "absolute", bottom: "1px", right: "1px",
              width: "10px", height: "10px", borderRadius: "50%",
              background: "var(--color-success)",
              border: "2px solid var(--color-surface)",
            }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text)" }}>Tricia</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-success)" }}>● Online</div>
          </div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => clearChat.mutate()}
          data-testid="button-clear-chat"
          style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
          title="Clear conversation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          Clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {loadingMsgs && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div className="tricia-avatar">T</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className="shimmer" style={{ width: "200px", height: "16px" }} />
              <div className="shimmer" style={{ width: "160px", height: "16px" }} />
            </div>
          </div>
        )}

        {!loadingMsgs && messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Tricia greeting */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div className="tricia-avatar">T</div>
              <div className="chat-bubble-tricia" style={{ maxWidth: "85%" }}>
                <div className="tricia-content">
                  <p>Hey {profile?.name || "there"} — I'm Tricia, your personal trainer. I've seen your profile.</p>
                  <p>I'm ready to build your first workout plan, coach you through a session, answer nutrition questions, or just talk training. What do you need?</p>
                </div>
              </div>
            </div>

            {/* Quick prompts */}
            <div style={{ paddingLeft: "2.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>Quick start</div>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage.mutate(p)}
                  data-testid={`button-prompt-${p.slice(0, 10)}`}
                  style={{
                    textAlign: "left",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "10px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.borderColor = "var(--color-orange)";
                    (e.target as HTMLElement).style.background = "var(--color-orange-subtle)";
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.borderColor = "var(--color-border)";
                    (e.target as HTMLElement).style.background = "var(--color-surface)";
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
          }}>
            {msg.role === "assistant" && <div className="tricia-avatar">T</div>}
            {msg.role === "user" ? (
              <div className="chat-bubble-user">{msg.content}</div>
            ) : (
              <div
                className="chat-bubble-tricia tricia-content"
                dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
              />
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div className="tricia-avatar">T</div>
            <div className="chat-bubble-tricia" style={{ padding: "0.875rem 1.25rem" }}>
              <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        position: "sticky",
        bottom: "72px",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        padding: "0.875rem 1.25rem",
      }}>
        <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message Tricia..."
            data-testid="input-message"
            rows={1}
            style={{
              flex: 1,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              color: "var(--color-text)",
              fontSize: "0.9375rem",
              lineHeight: 1.5,
              outline: "none",
              resize: "none",
              maxHeight: "120px",
              overflowY: "auto",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--color-orange)")}
            onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
          />
          <button
            className="btn-orange"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            data-testid="button-send"
            style={{
              padding: "0.75rem",
              minWidth: "44px",
              height: "44px",
              opacity: !input.trim() || isTyping ? 0.4 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", textAlign: "center", marginTop: "0.5rem" }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
