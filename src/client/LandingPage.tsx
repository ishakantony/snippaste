import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlugValidator } from "../shared/slugValidator.js";
import { SlugGenerator } from "./slugGenerator.js";

export function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
      <header className="landing-header">
        <h1 className="landing-title">snippaste</h1>
        <p className="landing-tagline">a tiny place to paste.</p>
      </header>

      <form className="landing-form" onSubmit={handleSubmit}>
        <div className="landing-input-row">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="name (optional)"
            className="landing-input"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button type="submit" className="landing-btn">
            snip →
          </button>
        </div>
        {error && <p className="landing-error">{error}</p>}
      </form>
    </div>
  );
}
