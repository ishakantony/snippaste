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
      const generated = SlugGenerator.generate();
      navigate(`/s/${generated}`);
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "sans-serif",
        gap: "1rem",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "2.5rem", fontWeight: 700 }}>
        snippaste
      </h1>
      <p style={{ margin: 0, color: "#555", fontSize: "1rem" }}>
        A tiny place to paste. Pick a name, start typing.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="name (optional)"
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              width: "220px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 1.25rem",
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            snip
          </button>
        </div>
        {error && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>{error}</span>
        )}
      </form>
    </div>
  );
}
