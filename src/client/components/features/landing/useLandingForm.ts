import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SlugGenerator } from "@/client/slugGenerator";
import { SlugValidator } from "@/shared/slugValidator";

export function useLandingForm() {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const { t } = useTranslation();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim().toLowerCase();

		if (trimmed === "") {
			navigate(`/s/${SlugGenerator.generate()}`);
			return;
		}

		const result = SlugValidator.validate(trimmed);
		if (!result.ok) {
			setError(t(`errors.${result.reason}`));
			return;
		}

		setError(null);
		navigate(`/s/${result.slug}`);
	}

	function handleNameChange(newName: string) {
		setName(newName);
		setError(null);
	}

	return { name, error, setName: handleNameChange, handleSubmit };
}
