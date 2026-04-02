import type { FamilyPlanDB, FamilyMemberDB, FamilyPlanData, FamilyMember } from "@/types/familyPlan";
import { supabase } from "@/integrations/supabase/client";

// Storage keys for localStorage fallback
const PLANS_KEY = 'family_plans';
const MEMBERS_KEY = 'family_members';
const HISTORY_KEY = 'family_action_history';

interface StoredPlan extends FamilyPlanDB {
  admin_user_id: string;
}

interface StoredMember extends FamilyMemberDB {
  family_plan_id: string;
}

function getStoredPlans(): StoredPlan[] {
  try {
    const stored = localStorage.getItem(PLANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePlans(plans: StoredPlan[]): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

function getStoredMembers(): StoredMember[] {
  try {
    const stored = localStorage.getItem(MEMBERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMembers(members: StoredMember[]): void {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

// Create a new family plan
export async function createFamilyPlan(
  adminUserId: string,
  planType: "family" | "family_plus",
  adminEmail: string,
  adminName?: string
): Promise<{ success: boolean; planId?: string; error?: string }> {
  try {
    const maxMembers = planType === "family_plus" ? 8 : 4;
    const planId = crypto.randomUUID();

    const newPlan: StoredPlan = {
      id: planId,
      admin_user_id: adminUserId,
      plan_type: planType,
      max_members: maxMembers,
      invites_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const plans = getStoredPlans();
    plans.push(newPlan);
    savePlans(plans);

    // Add admin as first member
    const members = getStoredMembers();
    members.push({
      id: crypto.randomUUID(),
      family_plan_id: planId,
      user_id: adminUserId,
      email: adminEmail,
      name: adminName || null,
      role: "admin",
      status: "active",
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invite_expires_at: null,
      removed_at: null,
    });
    saveMembers(members);

    return { success: true, planId };
  } catch (error: any) {
    console.error("Error creating family plan:", error);
    return { success: false, error: error.message };
  }
}

// Transform DB types to frontend types
function transformMember(member: FamilyMemberDB): FamilyMember {
  return {
    id: member.id,
    name: member.name || member.email,
    email: member.email,
    role: member.role as 'admin' | 'member',
    status: member.status as 'active' | 'invited' | 'pending',
    joinedAt: member.joined_at || undefined,
    avatar: undefined,
  };
}

function transformPlan(plan: FamilyPlanDB, members: FamilyMemberDB[], currentUserId: string): FamilyPlanData {
  const adminMember = members.find(m => m.role === 'admin');
  const activeMembers = members.filter(m => m.status === 'active' || m.status === 'invited');
  
  return {
    id: plan.id,
    adminId: plan.admin_user_id,
    adminEmail: adminMember?.email || '',
    maxMembers: plan.max_members,
    currentMembers: activeMembers.length,
    members: members.map(transformMember),
    planType: plan.plan_type === 'family' || plan.plan_type === 'family_plus' ? 'family' : 'individual',
    isAdmin: plan.admin_user_id === currentUserId,
  };
}

// Get family plan for a user (as admin or member)
export async function getFamilyPlan(userId: string): Promise<FamilyPlanData | null> {
  try {
    const plans = getStoredPlans();
    const members = getStoredMembers();

    // Check if user is admin of a plan
    const adminPlan = plans.find(p => p.admin_user_id === userId);
    if (adminPlan) {
      const planMembers = members.filter(m => m.family_plan_id === adminPlan.id && m.status !== 'removed');
      return transformPlan(adminPlan, planMembers as FamilyMemberDB[], userId);
    }

    // Check if user is a member
    const membership = members.find(m => m.user_id === userId && m.status !== 'removed');
    if (membership) {
      const plan = plans.find(p => p.id === membership.family_plan_id);
      if (plan) {
        const planMembers = members.filter(m => m.family_plan_id === plan.id && m.status !== 'removed');
        return transformPlan(plan, planMembers as FamilyMemberDB[], userId);
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching family plan:", error);
    return null;
  }
}

// Admin: Get family plan for any user
export async function getAdminFamilyPlan(userId: string): Promise<{
  plan: FamilyPlanDB | null;
  members: FamilyMemberDB[];
} | null> {
  try {
    const plans = getStoredPlans();
    const members = getStoredMembers();

    const plan = plans.find(p => p.admin_user_id === userId);
    if (!plan) return null;

    const planMembers = members.filter(m => m.family_plan_id === plan.id);
    return {
      plan: plan as FamilyPlanDB,
      members: planMembers as FamilyMemberDB[],
    };
  } catch (error) {
    console.error("Error fetching admin family plan:", error);
    return null;
  }
}

// Invite a new member
export async function inviteMember(
  familyPlanId: string,
  email: string,
  name?: string,
  actorUserId?: string,
  actorEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const members = getStoredMembers();
    members.push({
      id: crypto.randomUUID(),
      family_plan_id: familyPlanId,
      user_id: null,
      email,
      name: name || null,
      role: "member",
      status: "invited",
      invited_at: new Date().toISOString(),
      invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      joined_at: null,
      removed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    saveMembers(members);

    return { success: true };
  } catch (error: any) {
    console.error("Error inviting member:", error);
    return { success: false, error: error.message };
  }
}

// Remove a member
export async function removeMember(
  familyPlanId: string,
  memberId: string,
  sendNotification: boolean = true,
  actorUserId?: string,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const members = getStoredMembers();
    const idx = members.findIndex(m => m.id === memberId);
    if (idx >= 0) {
      members[idx].status = "removed";
      members[idx].removed_at = new Date().toISOString();
      saveMembers(members);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error removing member:", error);
    return { success: false, error: error.message };
  }
}

// Block/unblock a member
export async function toggleMemberBlock(
  familyPlanId: string,
  memberId: string,
  block: boolean,
  sendNotification: boolean = true,
  actorUserId?: string,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const members = getStoredMembers();
    const idx = members.findIndex(m => m.id === memberId);
    if (idx >= 0) {
      members[idx].status = block ? "blocked" : "active";
      saveMembers(members);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error toggling member block:", error);
    return { success: false, error: error.message };
  }
}

// Toggle invites blocked
export async function toggleInvitesBlocked(
  familyPlanId: string,
  blocked: boolean,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const plans = getStoredPlans();
    const idx = plans.findIndex(p => p.id === familyPlanId);
    if (idx >= 0) {
      plans[idx].invites_blocked = blocked;
      savePlans(plans);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error toggling invites:", error);
    return { success: false, error: error.message };
  }
}

// Force downgrade to individual plan
export async function forceDowngrade(
  familyPlanId: string,
  actorUserId: string,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const members = getStoredMembers();
    
    // Remove all non-admin members
    members.forEach((m, idx) => {
      if (m.family_plan_id === familyPlanId && m.role !== 'admin') {
        members[idx].status = 'removed';
        members[idx].removed_at = new Date().toISOString();
      }
    });
    saveMembers(members);

    // Update plan type
    const plans = getStoredPlans();
    const planIdx = plans.findIndex(p => p.id === familyPlanId);
    if (planIdx >= 0) {
      plans[planIdx].plan_type = 'individual';
      plans[planIdx].max_members = 1;
      savePlans(plans);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error forcing downgrade:", error);
    return { success: false, error: error.message };
  }
}

// Admin: Get all family plans with admin info
export interface FamilyPlanWithAdmin {
  plan: FamilyPlanDB;
  adminEmail: string;
  adminName: string;
  membersCount: number;
  activeMembers: number;
}

export async function getAllFamilyPlans(): Promise<FamilyPlanWithAdmin[]> {
  try {
    const plans = getStoredPlans();
    const members = getStoredMembers();

    // Get admin profiles from Supabase
    const adminIds = plans.map(p => p.admin_user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", adminIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return plans.map(plan => {
      const profile = profileMap.get(plan.admin_user_id);
      const planMembers = members.filter(m => m.family_plan_id === plan.id);
      const activeCount = planMembers.filter(m => m.status === 'active' || m.status === 'invited').length;
      
      return {
        plan: plan as FamilyPlanDB,
        adminEmail: profile?.email || "N/A",
        adminName: profile?.full_name || profile?.email || "N/A",
        membersCount: planMembers.length,
        activeMembers: activeCount,
      };
    });
  } catch (error) {
    console.error("Error fetching all family plans:", error);
    return [];
  }
}

// Admin: Create family plan for any user
export async function adminCreateFamilyPlan(
  adminUserId: string,
  targetUserId: string,
  planType: "family" | "family_plus",
  targetEmail: string,
  targetName?: string
): Promise<{ success: boolean; planId?: string; error?: string }> {
  return createFamilyPlan(targetUserId, planType, targetEmail, targetName);
}
