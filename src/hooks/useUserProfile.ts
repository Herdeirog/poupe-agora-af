import { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserPlan, UserSettings, SupportTicket } from '@/types/userProfile';
import * as storage from '@/services/userProfileStorage';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    storage.seedProfile();
    const data = await storage.getProfile();
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const updated = await storage.updateProfile(data);
    setProfile(updated);
    return updated;
  }, []);

  return { profile, loading, updateProfile, refresh: loadProfile };
}

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    const data = await storage.getPlan();
    const days = storage.getTrialDaysRemaining();
    setPlan(data);
    setTrialDays(days);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const updatePlan = useCallback(async (data: Partial<UserPlan>) => {
    const updated = await storage.updatePlan(data as UserPlan);
    if (updated?.plan) {
      setPlan(updated.plan);
      return updated.plan;
    }
    return null;
  }, []);

  return { plan, trialDays, loading, updatePlan, refresh: loadPlan };
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const data = await storage.getSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (data: Partial<UserSettings>) => {
    const updated = await storage.updateSettings(data);
    if (updated?.settings) {
      setSettings(updated.settings);
      return updated.settings;
    }
    return null;
  }, []);

  return { settings, loading, updateSettings, refresh: loadSettings };
}

export function useSupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const data = await storage.getTickets();
    setTickets(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const createTicket = useCallback(async (data: { subject: string; message: string }) => {
    const newTicket = await storage.createSupportTicket(data);
    await loadTickets();
    return newTicket;
  }, [loadTickets]);

  return { tickets, loading, createTicket, refresh: loadTickets };
}
