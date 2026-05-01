import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlugValidator } from "../shared/slugValidator.js";
import { SlugGenerator } from "./slugGenerator.js";
import { useTheme } from "./themeContext.js";

const ICON_PATHS: Record<string, string> = {
  sun: "M12 3v1m0 16v1M4.22 4.22l.71.71m12.02 12.02.71.71M1 12h1m18 0h1M4.22 19.78l.71-.71M18.95 5.05l-.71.71M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  arrow: "M5 12h14M12 5l7 7-7 7",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  copy: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  scissors: "M6 3l6 6m0 0l6-6M12 9v13M5.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

function Ico({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name] || ""} />
    </svg>
  );
}

export function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

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
      <button className="landing-theme-toggle" onClick={toggle}>
        <Ico name={theme === "dark" ? "sun" : "moon"} size={13} />
        {theme === "dark" ? "light mode" : "dark mode"}
      </button>

      <div className="landing-brand">
        <div className="landing-logo-row">
          <div className="landing-logo-box">
            <Ico name="scissors" size={17} />
          </div>
          <span className="landing-wordmark">Snippaste</span>
        </div>

        <h1 className="landing-headline">
          Share text.<br />
          <span className="accent">Instantly.</span>
        </h1>
        <p className="landing-desc">
          Create a snip, get a link. Share code snippets, notes, or anything in
          plain text — no signup, no setup.
        </p>
        <div className="landing-tags">
          <span className="landing-tag">Plain text only</span>
          <span className="landing-tag">Instant links</span>
          <span className="landing-tag">No account</span>
          <span className="landing-tag">30-day expiry</span>
        </div>
      </div>

      <div className="landing-divider-v" />

      <div className="landing-action">
        <div className="landing-form-wrapper">
          <div className="landing-form-header">
            <div className="landing-form-title">New snip</div>
            <div className="landing-form-subtitle">
              You'll get a shareable URL right away. Start typing in the editor.
            </div>
          </div>

          <form className="landing-form" onSubmit={handleSubmit}>
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
              <div className="landing-helper">Leave blank to get a random ID</div>
            </div>
            {error && <p className="landing-error">{error}</p>}
            <button type="submit" className="landing-btn">
              Create snip <Ico name="arrow" size={15} />
            </button>
          </form>

          <div className="landing-divider-h" />

          <div className="landing-features">
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <Ico name="zap" size={13} />
              </div>
              <div>
                <span className="landing-feature-label">Instant</span>
                <span className="landing-feature-desc"> — Shareable URL in one click</span>
              </div>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <Ico name="copy" size={13} />
              </div>
              <div>
                <span className="landing-feature-label">Plain text</span>
                <span className="landing-feature-desc"> — No markup, no clutter</span>
              </div>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <Ico name="shield" size={13} />
              </div>
              <div>
                <span className="landing-feature-label">Ephemeral</span>
                <span className="landing-feature-desc"> — Snips expire after 30 days</span>
              </div>
            </div>
          </div>

          <div className="landing-fine-print">
            Snips are public. Do not paste sensitive data. Content expires and is removed after 30 days.
          </div>
        </div>
      </div>
    </div>
  );
}
