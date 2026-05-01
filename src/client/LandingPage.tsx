import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlugValidator } from "../shared/slugValidator.js";
import { SlugGenerator } from "./slugGenerator.js";
import { useTheme } from "./themeContext.js";

const FEATURES = [
  {
    label: "Instant",
    desc: "Shareable URL in one click",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6470F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    label: "Plain text",
    desc: "No markup, no clutter",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6470F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
  {
    label: "Ephemeral",
    desc: "Snips expire after 30 days",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6470F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (launching) return;

    const trimmed = name.trim().toLowerCase();

    if (trimmed === "") {
      navigate(`/s/${SlugGenerator.generate()}`);
      return;
    }

    const result = SlugValidator.validate(trimmed);
    if (!result.ok) {
      setError(result.reason);
      return;
    }

    setLaunching(true);
    setError(null);
    setTimeout(() => {
      navigate(`/s/${result.slug}`);
    }, 220);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit(e);
  }

  return (
    <div className="landing">
      <button className="landing-theme-toggle" onClick={toggle}>
        {dark ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        {dark ? "light mode" : "dark mode"}
      </button>

      {/* Left — brand */}
      <div className="landing-left">
        <div className="landing-brand">
          <div className="landing-brand-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6470F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>
          <span className="landing-brand-text">Snippaste</span>
        </div>

        <div className="landing-headline">
          Share text.
          <br />
          <span className="landing-headline-accent">Instantly.</span>
        </div>

        <div className="landing-desc">
          Create a snip, get a link. Share code snippets, notes, or anything in plain text — no signup, no setup.
        </div>

        <div className="landing-tags">
          {["Plain text only", "Instant links", "No account", "30-day expiry"].map((tag) => (
            <span key={tag} className="landing-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="landing-divider" />

      {/* Right — action panel */}
      <div className="landing-right">
        <form className="landing-panel" onSubmit={handleSubmit}>
          <div>
            <div className="landing-panel-title">New snip</div>
            <div className="landing-panel-subtitle">
              You'll get a shareable URL right away. Start typing in the editor.
            </div>
          </div>

          <div className="landing-input-wrap">
            <label className="landing-input-label">Snip name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. my-config (optional)"
              className="landing-input"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div className="landing-input-hint">Leave blank to get a random ID</div>
            {error && <div className="landing-input-error">{error}</div>}
          </div>

          <button type="submit" className="landing-cta" disabled={launching}>
            {launching ? "Opening editor…" : "Create snip"}
            {!launching && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>

          <div className="landing-panel-divider" />

          <div className="landing-features">
            {FEATURES.map((f) => (
              <div key={f.label} className="landing-feature">
                <div className="landing-feature-icon">{f.icon}</div>
                <div>
                  <span className="landing-feature-label">{f.label}</span>
                  <span className="landing-feature-desc"> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="landing-fine-print">
            Snips are public. Do not paste sensitive data. Content expires and is removed after 30 days.
          </div>
        </form>
      </div>
    </div>
  );
}
