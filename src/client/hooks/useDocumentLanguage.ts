import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useDocumentLanguage(slug?: string) {
	const { i18n, t } = useTranslation();

	useEffect(() => {
		document.documentElement.lang = i18n.language;
	}, [i18n.language]);

	useEffect(() => {
		if (slug !== undefined) {
			document.title = t("editor.pageTitle", { slug });
		} else {
			document.title = t("landing.pageTitle");
		}
	}, [slug, t]);
}
