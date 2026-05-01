import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlugValidator } from "../shared/slugValidator.js";
import { SlugGenerator } from "./slugGenerator.js";
import { useTheme } from "./themeContext.js";

function ScissorsIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l6 6m0 0l6-6M12 9v13M5.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    </svg>
  );
}

function ZapIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
    </svg>
  );
}

function CopyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ShieldIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ArrowIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function SunIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2" />
      <path d="M12 21v2" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M18.36 18.36l1.42 1.42" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
      <path d="M4.22 19.78l1.42-1.42" />
      <path d="M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim().toLowerCase();

    if (trimmed === "") {
      setLaunching(true);
      setTimeout(() => {
        navigate(`/s/${SlugGenerator.generate()}`);
      }, 220);
      return;
    }

    const result = SlugValidator.validate(trimmed);
    if (!result.ok) {
      setError(result.reason);
      return;
    }

    setError(null);
    setLaunching(true);
    setTimeout(() => {
      navigate(`/s/${result.slug}`);
    }, 220);
  }

  return (
    <div className="landing">
      <button className="landing-theme-btn" onClick={toggle}>
        {theme === "dark" ? <SunIcon size={13} /> : <MoonIcon size={13} />}
        {theme === "dark" ? "light mode" : "dark mode"}
      </button>

      <div className="landing-brand">
        <div className="landing-logo-box">
          <div className="landing-logo-icon-wrap">
            <ScissorsIcon size={17} />
          </div>
          <span className="landing-logo-text">Snippaste</span>
        </div>

        <h1 className="landing-headline">
          Share text.<br />
          <span className="landing-headline-accent">Instantly.</span>
        </h1>

        <p className="landing-desc">
          Create a snip, get a link. Share code snippets, notes, or anything in plain text — no signup, no setup.
        </p>

        <div className="landing-tags">
          <span className="landing-tag">Plain text only</span>
          <span className="landing-tag">Instant links</span>
          <span className="landing-tag">No account</span>
          <span className="landing-tag">30-day expiry</span>
        </div>
      </div>

      <div className="landing-divider" />

      <div className="landing-action">
        <div className="landing-action-inner">
          <div>
            <div className="landing-panel-header">New snip</div>
            <p className="landing-panel-subtitle">You'll get a shareable URL right away. Start typing in the editor.</p>
          </div>

          <form onSubmit={handleSubmit} className="landing-form">
            <div className="landing-input-group">
              <label className="landing-input-label">Snip name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. my-config (optional)"
                className="landing-input"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <p className="landing-helper">Leave blank to get a random ID</p>
              {error && <p className="landing-error">{error}</p>}
            </div>
            <button
              type="submit"
              className="landing-cta"
              disabled={launching}
              style={{ opacity: launching ? 0.75 : 1 }}
            >
              {launching ? "Opening editor…" : "Create snip"}
              {!launching && <ArrowIcon size={15} />}
            </button>
          </form>

          <div className="landing-features-divider" />

          <div className="landing-features">
            <div className="landing-feature">
              <div className="landing-feature-icon-wrap">
                <ZapIcon size={13} />
              </div>
              <div>
                <span className="landing-feature-label">Instant</span>
                <span className="landing-feature-desc"> — Shareable URL in one click</span>
              </div>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon-wrap">
                <CopyIcon size={13} />
              </div>
              <div>
                <span className="landing-feature-label">Plain text</span>
                <span className="landing-feature-desc"> — No markup, no clutter</span>
              </div>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon-wrap">
                <ShieldIcon size={13} />
              </div>
              <div>
                <span className="landing-feature-label">Ephemeral</span>
                <span className="landing-feature-desc"> — Snips expire after 30 days</span>
              </div>
            </div>
          </div>

          <p className="landing-footer">Snips are public. Do not paste sensitive data. Content expires and is removed after 30 days.</p>
        </div>
      </div>
    </div>
  );
}
