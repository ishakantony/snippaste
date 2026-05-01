import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlugValidator } from "../shared/slugValidator.js";
import { SlugGenerator } from "./slugGenerator.js";
import { useTheme } from "./themeContext.js";
import { Icon } from "./Icon.js";

export function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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
      <button type="button" className="landing-theme" onClick={toggleTheme}>
        <Icon name={theme === "dark" ? "sun" : "moon"} size={13} />
        {theme === "dark" ? "light mode" : "dark mode"}
      </button>

      <section className="landing-brand-panel">
        <div className="wordmark"><span className="brand-chip"><Icon name="scissors" size={17} /></span>Snippaste</div>
        <h1 className="landing-title">Share text.<br /><span>Instantly.</span></h1>
        <p className="landing-tagline">Create a snip, get a link. Share code snippets, notes, or anything in plain text — no signup, no setup.</p>
        <div className="landing-tags">
          <span>Plain text only</span>
          <span>Instant links</span>
          <span>No account</span>
          <span>30-day expiry</span>
        </div>
      </section>

      <div className="landing-divider" />

      <section className="landing-action-panel">
        <div className="landing-action-stack">
          <div className="landing-panel-header">
            <h2>New snip</h2>
            <p>You'll get a shareable URL right away. Start typing in the editor.</p>
          </div>

          <form className="landing-form" onSubmit={handleSubmit}>
          <label htmlFor="slug-input">Snip name</label>
          <input
            id="slug-input"
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
          <button type="submit" className="landing-btn">Create snip <Icon name="arrow" size={15} /></button>
        </form>

        <div className="landing-rule" />

        <div className="feature-list">
          <div><strong><Icon name="zap" size={13} /></strong><span><b>Instant</b> — Shareable URL in one click</span></div>
          <div><strong><Icon name="copy" size={13} /></strong><span><b>Plain text</b> — No markup, no clutter</span></div>
          <div><strong><Icon name="shield" size={13} /></strong><span><b>Ephemeral</b> — Snips expire after 30 days</span></div>
        </div>
        <p className="landing-fineprint">Snips are public. Do not paste sensitive data. Content expires and is removed after 30 days.</p>
        </div>
      </section>
    </div>
  );
}
