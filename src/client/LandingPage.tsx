import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlugValidator } from "../shared/slugValidator.js";
import { SlugGenerator } from "./slugGenerator.js";
import { Icon } from "./Icon.js";
import { useTheme } from "./themeContext.js";

const FEATURES = [
  { icon: "zap", label: "Instant", desc: "Shareable URL in one click" },
  { icon: "copy", label: "Plain text", desc: "No markup, no clutter" },
  { icon: "shield", label: "Ephemeral", desc: "Snips expire after 30 days" },
] as const;

const TAGS = ["Plain text only", "Instant links", "No account", "30-day expiry"];

export function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      <button
        type="button"
        className="theme-toggle landing-theme"
        onClick={toggle}
        aria-label="Toggle theme"
      >
        <Icon name={dark ? "sun" : "moon"} size={13} />
        {dark ? "light mode" : "dark mode"}
      </button>

      <div className="landing-left">
        <div className="landing-brand">
          <div className="landing-brand-mark">
            <Icon name="scissors" size={17} color="var(--accent)" />
          </div>
          <span className="landing-wordmark">Snippaste</span>
        </div>

        <h1 className="landing-headline">
          Share text.
          <br />
          <span className="landing-headline-accent">Instantly.</span>
        </h1>

        <p className="landing-description">
          Create a snip, get a link. Share code snippets, notes, or anything in plain text — no signup, no setup.
        </p>

        <div className="landing-tags">
          {TAGS.map((tag) => (
            <span key={tag} className="landing-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="landing-divider" />

      <div className="landing-right">
        <form className="landing-form" onSubmit={handleSubmit}>
          <div>
            <div className="landing-form-title">New snip</div>
            <div className="landing-form-sub">
              You'll get a shareable URL right away. Start typing in the editor.
            </div>
          </div>

          <div className="landing-field">
            <label className="landing-label" htmlFor="snip-name">
              Snip name
            </label>
            <input
              id="snip-name"
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
            <div className="landing-help">Leave blank to get a random ID</div>
            {error && <div className="landing-error">{error}</div>}
          </div>

          <button type="submit" className="landing-cta">
            Create snip
            <Icon name="arrow" size={15} color="#fff" />
          </button>

          <div className="landing-section-divider" />

          <div className="landing-features">
            {FEATURES.map((f) => (
              <div className="landing-feature" key={f.icon}>
                <div className="landing-feature-icon">
                  <Icon name={f.icon} size={13} color="var(--accent)" />
                </div>
                <div className="landing-feature-text">
                  <span className="landing-feature-label">{f.label}</span>
                  <span className="landing-feature-desc"> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="landing-fineprint">
            Snips are public. Do not paste sensitive data. Content expires and is removed after 30 days.
          </div>
        </form>
      </div>
    </div>
  );
}
