import {
	CreateSnipForm,
	HeaderActions,
	HeroSection,
	useLandingForm,
} from "@/client/components/features/landing/index";
import { useDocumentLanguage } from "@/client/hooks/useDocumentLanguage";

export function LandingPage() {
	useDocumentLanguage();
	const { name, error, setName, handleSubmit } = useLandingForm();

	return (
		<div
			className="relative flex h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-auto bg-bg md:h-screen md:flex-row md:overflow-hidden"
			data-testid="landing-page"
		>
			<HeaderActions />
			<HeroSection />
			<div className="order-3 mx-5 h-px bg-border md:order-2 md:mx-0 md:my-12 md:h-auto md:w-px md:shrink-0" />
			<CreateSnipForm
				name={name}
				error={error}
				onNameChange={setName}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
