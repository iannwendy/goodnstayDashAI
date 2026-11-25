import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadSeedMasterBundle } from "../helpers/seed-loader";
import { buildOverviewViewModel } from "../../src/services/overviewAnalytics";
import {
  ALL_SYSTEM_PROPERTY_IDS,
  canProfileManagePricing,
  canProfileViewChainAll,
  canProfileViewFinancials,
  clampPropertyKeyForProfile,
  deriveNextPropertyKeyOnUserSwitch,
  filterPropertiesForProfile,
  getEffectiveAllowedBranchIds,
  resolveStaffProfile,
} from "../../src/lib/rbacScoping";

describe("TC-RBAC: Multi-Tenant user_id × branch_id Scoping & Clamping", () => {
  const bundle = loadSeedMasterBundle();
  const profiles = bundle.hubConfig.staffProfiles ?? [];
  const overviewAll = buildOverviewViewModel(bundle, {
    propertyKey: "all",
    periodKey: "30d",
    locale: "vi",
    currency: "VND",
  });

  it("TC-RBAC-01: resolves all 5 RBAC profiles and enforces exact allowedBranchIds & permission flags", () => {
    assert.equal(profiles.length, 5);

    const owner = resolveStaffProfile(profiles, "USR-PARTNER-01");
    assert.equal(owner.userId, "USR-PARTNER-01");
    assert.deepEqual(
      getEffectiveAllowedBranchIds(owner, ALL_SYSTEM_PROPERTY_IDS),
      ["br_mykhe", "br_songhan", "br_anthuong", "stay_h11"],
    );
    assert.equal(canProfileViewChainAll(owner), true);
    assert.equal(canProfileViewFinancials(owner), true);
    assert.equal(canProfileManagePricing(owner), true);

    const mgrMk = resolveStaffProfile(profiles, "USR-MGR-MYKHE");
    assert.deepEqual(
      getEffectiveAllowedBranchIds(mgrMk, ALL_SYSTEM_PROPERTY_IDS),
      ["br_mykhe"],
    );
    assert.equal(canProfileViewChainAll(mgrMk), false);
    assert.equal(canProfileViewFinancials(mgrMk), true);
    assert.equal(canProfileManagePricing(mgrMk), true);

    const mgrSh = resolveStaffProfile(profiles, "USR-MGR-SONGHAN");
    assert.deepEqual(
      getEffectiveAllowedBranchIds(mgrSh, ALL_SYSTEM_PROPERTY_IDS),
      ["br_songhan"],
    );

    const rec = resolveStaffProfile(profiles, "USR-STAFF-02");
    assert.deepEqual(
      getEffectiveAllowedBranchIds(rec, ALL_SYSTEM_PROPERTY_IDS),
      ["br_mykhe"],
    );
    assert.equal(canProfileViewChainAll(rec), false);
    assert.equal(canProfileViewFinancials(rec), false);
    assert.equal(canProfileManagePricing(rec), false);

    const mgrH11 = resolveStaffProfile(profiles, "USR-MGR-H11");
    assert.deepEqual(
      getEffectiveAllowedBranchIds(mgrH11, ALL_SYSTEM_PROPERTY_IDS),
      ["stay_h11"],
    );
    assert.equal(canProfileViewChainAll(mgrH11), false);
    assert.equal(canProfileViewFinancials(mgrH11), true);
    assert.equal(canProfileManagePricing(mgrH11), true);
  });

  it("TC-RBAC-02: filterPropertiesForProfile restricts dropdown strictly to each user's authorized branches", () => {
    const owner = resolveStaffProfile(profiles, "USR-PARTNER-01");
    const ownerOpts = filterPropertiesForProfile(overviewAll.properties, owner);
    assert.deepEqual(
      ownerOpts.map((o) => o.key),
      ["all", "br_mykhe", "br_songhan", "br_anthuong", "stay_h11"],
    );

    const mgrMk = resolveStaffProfile(profiles, "USR-MGR-MYKHE");
    const mkOpts = filterPropertiesForProfile(overviewAll.properties, mgrMk);
    assert.deepEqual(
      mkOpts.map((o) => o.key),
      ["br_mykhe"],
    );

    const mgrSh = resolveStaffProfile(profiles, "USR-MGR-SONGHAN");
    const shOpts = filterPropertiesForProfile(overviewAll.properties, mgrSh);
    assert.deepEqual(
      shOpts.map((o) => o.key),
      ["br_songhan"],
    );

    const rec = resolveStaffProfile(profiles, "USR-STAFF-02");
    const recOpts = filterPropertiesForProfile(overviewAll.properties, rec);
    assert.deepEqual(
      recOpts.map((o) => o.key),
      ["br_mykhe"],
    );

    const mgrH11 = resolveStaffProfile(profiles, "USR-MGR-H11");
    const h11Opts = filterPropertiesForProfile(overviewAll.properties, mgrH11);
    assert.deepEqual(
      h11Opts.map((o) => o.key),
      ["stay_h11"],
    );
  });

  it("TC-RBAC-03: clampPropertyKeyForProfile & deriveNextPropertyKeyOnUserSwitch prevent cross-branch selection", () => {
    const owner = resolveStaffProfile(profiles, "USR-PARTNER-01");
    const mgrMk = resolveStaffProfile(profiles, "USR-MGR-MYKHE");
    const mgrSh = resolveStaffProfile(profiles, "USR-MGR-SONGHAN");
    const mgrH11 = resolveStaffProfile(profiles, "USR-MGR-H11");

    // Unauthorized branch or "all" is clamped to allowedBranchIds[0]
    assert.equal(clampPropertyKeyForProfile("all", mgrMk), "br_mykhe");
    assert.equal(clampPropertyKeyForProfile("br_songhan", mgrMk), "br_mykhe");
    assert.equal(clampPropertyKeyForProfile("br_mykhe", mgrSh), "br_songhan");
    assert.equal(clampPropertyKeyForProfile("br_mykhe", mgrH11), "stay_h11");

    // Sequential handover flow: owner(all) -> mgrMk(br_mykhe) -> mgrSh(br_songhan) -> mgrH11(stay_h11) -> owner(all)
    const step1 = deriveNextPropertyKeyOnUserSwitch(owner, mgrMk, "all");
    assert.equal(step1, "br_mykhe");

    const step2 = deriveNextPropertyKeyOnUserSwitch(mgrMk, mgrSh, step1);
    assert.equal(step2, "br_songhan");

    const step3 = deriveNextPropertyKeyOnUserSwitch(mgrSh, mgrH11, step2);
    assert.equal(step3, "stay_h11");

    const step4 = deriveNextPropertyKeyOnUserSwitch(mgrH11, owner, step3);
    assert.equal(step4, "all");
  });
});
