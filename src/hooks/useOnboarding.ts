import { useState, useEffect } from 'react';

interface OnboardingState {
  hasCompletedWelcome: boolean;
  hasCompletedSetup: boolean;
  hasCompletedTour: boolean;
  setupStep: number;
}

const ONBOARDING_KEY = 'poupe_agora_onboarding';

const defaultState: OnboardingState = {
  hasCompletedWelcome: false,
  hasCompletedSetup: false,
  hasCompletedTour: false,
  setupStep: 0,
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = localStorage.getItem(ONBOARDING_KEY);
    try {
      return saved ? JSON.parse(saved) : defaultState;
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  }, [state]);

  const completeWelcome = () => {
    setState(prev => ({ ...prev, hasCompletedWelcome: true }));
  };

  const completeSetup = () => {
    setState(prev => ({ ...prev, hasCompletedSetup: true }));
  };

  const completeTour = () => {
    setState(prev => ({ ...prev, hasCompletedTour: true }));
  };

  const setSetupStep = (step: number) => {
    setState(prev => ({ ...prev, setupStep: step }));
  };

  const resetOnboarding = () => {
    setState(defaultState);
  };

  const isNewUser = !state.hasCompletedWelcome;
  const needsSetup = state.hasCompletedWelcome && !state.hasCompletedSetup;
  const needsTour = state.hasCompletedSetup && !state.hasCompletedTour;

  return {
    ...state,
    isNewUser,
    needsSetup,
    needsTour,
    completeWelcome,
    completeSetup,
    completeTour,
    setSetupStep,
    resetOnboarding,
  };
}
