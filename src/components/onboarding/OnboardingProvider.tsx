import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeModal } from './WelcomeModal';
import { SetupWizard } from './SetupWizard';
import { GuidedTour } from './GuidedTour';

export function OnboardingProvider() {
  const {
    isNewUser,
    needsSetup,
    needsTour,
    completeWelcome,
    completeSetup,
    completeTour,
  } = useOnboarding();

  return (
    <>
      {/* Welcome Modal - First time user */}
      <WelcomeModal
        open={isNewUser}
        onComplete={completeWelcome}
      />

      {/* Setup Wizard - After welcome */}
      <SetupWizard
        open={needsSetup}
        onComplete={completeSetup}
        onSkip={completeSetup}
      />

      {/* Guided Tour - After setup */}
      <GuidedTour
        active={needsTour}
        onComplete={completeTour}
      />
    </>
  );
}
