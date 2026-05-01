import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlugValidator } from "../shared/slugValidator.js";
import { SlugGenerator } from "./slugGenerator.js";
import { useTheme } from "./themeContext.js";

const FEATURE_ROWS = [
  {
    iconPath: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    label: "Instant",
    desc: "Shareable URL in one click",
  },
  {
    iconPath: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
    label: "Plain text",
    desc: "No markup, no clutter",
  },
  {
    iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    label: "Ephemeral",
    desc: "Snips expire after 30 days",
  },
];

const TAGS = ["Plain text only", "Instant links", "No account", "30-day expiry"];

function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const SCISSORS_PATH = "M6 3l6 6m0 0l6-6M12 9v13M5.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";
const ARROW_PATH = "M5 12h14M12 5l7 7-7 7";
const SUN_PATH = "M12 3v1m0 16v1M4.22 4.22l.71.71m12.02 12.02.71.71M1 12h1m18 0h1M4.22 19.78l.71-.71M18.95 5.05l-.71.71M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z";
const MOON_PATH = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";

export function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setError(null);
    navigate(`/s/${result.slug}`);
  }

  return (
    <div className="landing">
      {/* Theme toggle — top right */}
      <button className="landing-theme-btn" onClick={toggle}>
        <Icon path={dark ? SUN_PATH : MOON_PATH} size={13} />
        {dark ? "light mode" : "dark mode"}
      </button>

      {/* Left — brand panel */}
      <div className="landing-brand">
        {/* Logo + wordmark */}
        <div className="landing-logo-row">
          <div className="landing-logo-icon">
            <Icon path={SCISSORS_PATH} size={17} />
          </div>
          <span className="landing-wordmark">Snippaste</span>
        </div>

        {/* Headline */}
        <h1 className="landing-headline">
          Share text.<br />
          <span className="landing-accent">Instantly.</span>
        </h1>

        {/* Description */}
        <p className="landing-desc">
          Create a snip, get a link. Share code snippets, notes, or anything in plain text — no signup, no setup.
        </p>

        {/* Tag pills */}
        <div className="landing-pills">
          {TAGS.map((tag) => (
            <span key={tag} className="landing-pill">{tag}</span>
          ))}
        </div>
      </div>

      {/* Vertical divider */}
      <div className="landing-divider" />

      {/* Right — action panel */}
      <div className="landing-action">
        <div className="landing-action-body">
          {/* Header */}
          <div className="landing-action-header">
            <div className="landing-action-title">New snip</div>
            <div className="landing-action-desc">You'll get a shareable URL right away. Start typing in the editor.</div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="landing-form">
            <label className="landing-input-label">Snip name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. my-config (optional)"
              className={`landing-input${focused ? " landing-input--focused" : ""}`}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoFocus
            />
            <div className="landing-helper">Leave blank to get a random ID</div>
            {error && <p className="landing-error">{error}</p>}

            <button type="submit" className="landing-cta">
              Create snip
              <Icon path={ARROW_PATH} size={15} />
            </button>
          </form>

          {/* Divider */}
          <div className="landing-sep" />

          {/* Feature rows */}
          <div className="landing-features">
            {FEATURE_ROWS.map((row) => (
              <div key={row.label} className="landing-feature-row">
                <div className="landing-feature-icon">
                  <Icon path={row.iconPath} size={13} />
                </div>
                <div className="landing-feature-text">
                  <span className="landing-feature-label">{row.label}</span>
                  <span className="landing-feature-desc"> — {row.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Fine print */}
          <div className="landing-fine-print">
            <div className="landing-fine-sep" />
            Snips are public. Do not paste sensitive data. Content expires and is removed after 30 days.
          </div>
        </div>
      </div>
    </div>
  );
}
