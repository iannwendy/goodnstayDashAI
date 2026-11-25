import type { PartnerUserMaster, PropertyId, StaffRoleKey } from "@/data";
import type {
  PropertyFilterKey,
  PropertyOptionItem,
} from "@/services/overviewAnalytics";

export const ALL_SYSTEM_PROPERTY_IDS: PropertyId[] = [
  "br_mykhe",
  "br_songhan",
  "br_anthuong",
  "stay_h11",
];

export function resolveStaffProfile(
  profiles: PartnerUserMaster[],
  activeUserId?: string | null,
  fallbackRoleKey?: StaffRoleKey | null,
): PartnerUserMaster {
  if (activeUserId) {
    const exact = profiles.find((p) => p.userId === activeUserId);
    if (exact) return exact;
  }
  if (fallbackRoleKey) {
    const byRole = profiles.find((p) => p.roleKey === fallbackRoleKey);
    if (byRole) return byRole;
  }
  return profiles[0];
}

export function getEffectiveAllowedBranchIds(
  profile: PartnerUserMaster,
  allPropertyIds: PropertyId[] = ALL_SYSTEM_PROPERTY_IDS,
): PropertyId[] {
  if (
    Array.isArray(profile.allowedBranchIds) &&
    profile.allowedBranchIds.length > 0
  ) {
    const allowedSet = new Set(allPropertyIds);
    const filtered = profile.allowedBranchIds.filter((id) =>
      allowedSet.has(id),
    );
    if (filtered.length > 0) return filtered;
  }
  if (profile.roleKey === "manager") {
    return [...allPropertyIds];
  }
  return [allPropertyIds[0] ?? "br_mykhe"];
}

export function canProfileViewChainAll(profile: PartnerUserMaster): boolean {
  if (typeof profile.canViewChainAll === "boolean") {
    return profile.canViewChainAll;
  }
  return profile.roleKey === "manager";
}

export function canProfileViewFinancials(profile: PartnerUserMaster): boolean {
  if (typeof profile.canViewFinancials === "boolean") {
    return profile.canViewFinancials;
  }
  return profile.roleKey !== "receptionist";
}

export function canProfileManagePricing(profile: PartnerUserMaster): boolean {
  if (typeof profile.canManagePricing === "boolean") {
    return profile.canManagePricing;
  }
  return profile.roleKey !== "receptionist";
}

export function filterPropertiesForProfile(
  allOptions: PropertyOptionItem[],
  profile: PartnerUserMaster,
): PropertyOptionItem[] {
  const allowAll = canProfileViewChainAll(profile);
  const allPropIds = allOptions
    .filter((o): o is PropertyOptionItem & { key: PropertyId } => o.key !== "all")
    .map((o) => o.key);
  const allowedBranches = new Set(
    getEffectiveAllowedBranchIds(profile, allPropIds),
  );

  const filtered = allOptions.filter((opt) => {
    if (opt.key === "all") return allowAll;
    return allowedBranches.has(opt.key);
  });

  if (filtered.length > 0) return filtered;
  return allOptions.slice(0, 1);
}

export function clampPropertyKeyForProfile(
  currentKey: PropertyFilterKey,
  profile: PartnerUserMaster,
  allPropertyIds: PropertyId[] = ALL_SYSTEM_PROPERTY_IDS,
): PropertyFilterKey {
  const allowAll = canProfileViewChainAll(profile);
  const allowedBranches = getEffectiveAllowedBranchIds(profile, allPropertyIds);

  if (currentKey === "all") {
    return allowAll ? "all" : (allowedBranches[0] ?? "br_mykhe");
  }
  if (allowedBranches.includes(currentKey)) {
    return currentKey;
  }
  return allowAll ? "all" : (allowedBranches[0] ?? "br_mykhe");
}

export function deriveNextPropertyKeyOnUserSwitch(
  prevProfile: PartnerUserMaster,
  nextProfile: PartnerUserMaster,
  currentKey: PropertyFilterKey,
  allPropertyIds: PropertyId[] = ALL_SYSTEM_PROPERTY_IDS,
): PropertyFilterKey {
  const prevCanAll = canProfileViewChainAll(prevProfile);
  const nextCanAll = canProfileViewChainAll(nextProfile);

  // When elevating from a single-branch account back to a chain owner, default back to "all"
  if (!prevCanAll && nextCanAll) {
    return "all";
  }
  return clampPropertyKeyForProfile(currentKey, nextProfile, allPropertyIds);
}
