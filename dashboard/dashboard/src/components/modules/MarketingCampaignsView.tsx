import { useState } from "react";
import {
  Megaphone,
  Flame,
  Sparkles,
  TrendingUp,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type {
  FlashDealCampaignMaster,
  HubNavSection,
  MarketingCampaignsMaster,
  PropertyId,
  StaffRoleKey,
  UpsellCategory,
  UpsellPackageMaster,
} from "@/data";
import type { HubModulesCopy } from "@/lib/hubModulesI18n";
import type { MarketingModuleViewModel } from "@/services/hubModulesAnalytics";
import type { PropertyFilterKey } from "@/services/overviewAnalytics";

interface MarketingCampaignsViewProps {
  activeSubTab: "marketing_deals" | "marketing_upsell";
  onChangeSubTab: (next: HubNavSection) => void;
  vm: MarketingModuleViewModel;
  marketingCampaigns: MarketingCampaignsMaster;
  propertyKey: PropertyFilterKey;
  mCopy: HubModulesCopy;
  activeRole: StaffRoleKey;
  onRequireManagerRole: () => void;
  onSaveMarketingCampaigns: (
    next: MarketingCampaignsMaster,
    notice?: string,
  ) => void;
}

export function MarketingCampaignsView({
  activeSubTab,
  onChangeSubTab,
  vm,
  marketingCampaigns,
  propertyKey,
  mCopy,
  activeRole,
  onRequireManagerRole,
  onSaveMarketingCampaigns,
}: MarketingCampaignsViewProps) {
  const mk = mCopy.marketing;
  const isDealsTab = activeSubTab === "marketing_deals";

  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealDiscountPct, setDealDiscountPct] = useState(15);
  const [dealOrigRate, setDealOrigRate] = useState(1150000);
  const [dealQuota, setDealQuota] = useState(3);

  const [createUpsellOpen, setCreateUpsellOpen] = useState(false);
  const [upsellTitle, setUpsellTitle] = useState("");
  const [upsellCategory, setUpsellCategory] =
    useState<UpsellCategory>("room_upgrade");
  const [upsellPrice, setUpsellPrice] = useState(300000);

  const targetPropertyForNew: PropertyId =
    propertyKey === "all" ? "br_mykhe" : propertyKey;

  const handleToggleDeal = (dealId: string, nextActive: boolean) => {
    const nextData: MarketingCampaignsMaster = {
      ...marketingCampaigns,
      flashDeals: marketingCampaigns.flashDeals.map((d) =>
        d.id === dealId ? { ...d, active: nextActive } : d,
      ),
    };
    onSaveMarketingCampaigns(nextData, mCopy.common.savedToast);
  };

  const handleToggleUpsell = (upsellId: string, nextActive: boolean) => {
    const nextData: MarketingCampaignsMaster = {
      ...marketingCampaigns,
      upsellOffers: marketingCampaigns.upsellOffers.map((u) =>
        u.id === upsellId ? { ...u, active: nextActive } : u,
      ),
    };
    onSaveMarketingCampaigns(nextData, mCopy.common.savedToast);
  };

  const handleCreateFlashDeal = () => {
    const titleStr = dealTitle.trim() || "Flash Deal";
    const pct = Math.min(50, Math.max(5, Number(dealDiscountPct) || 15));
    const orig = Math.max(300_000, Number(dealOrigRate) || 1_000_000);
    const dealRate = Math.round((orig * (100 - pct)) / 100);
    const quota = Math.max(1, Number(dealQuota) || 2);

    const created: FlashDealCampaignMaster = {
      id: `DEAL-${Date.now()}`,
      propertyId: targetPropertyForNew,
      title: { vi: titleStr, en: titleStr, ko: titleStr },
      subtitle: {
        vi: "Áp dụng khung giờ tối nhằm lấp đầy phòng trống trong ngày",
        en: "Evening last-minute allocation to capture same-day stays",
        ko: "당일 잔여 객실 판매를 위한 저녁 마감 특가",
      },
      roomTypeName: {
        vi: "Phòng Deluxe Tiêu Chuẩn",
        en: "Deluxe Standard Room",
        ko: "디럭스 스탠다드",
      },
      bookingWindowLabel: {
        vi: "18:00 – 23:59 hàng ngày",
        en: "Daily 18:00 – 23:59",
        ko: "매일 18:00 – 23:59",
      },
      discountPct: pct,
      originalRateVnd: orig,
      dealRateVnd: dealRate,
      dailyRoomQuota: quota,
      roomsSold30d: 0,
      netRevenue30dVnd: 0,
      perks: ["breakfast", "wifi"],
      active: true,
    };

    setCreateDealOpen(false);
    setDealTitle("");
    onSaveMarketingCampaigns(
      {
        ...marketingCampaigns,
        flashDeals: [created, ...marketingCampaigns.flashDeals],
      },
      mCopy.common.savedToast,
    );
  };

  const handleCreateUpsell = () => {
    const titleStr = upsellTitle.trim() || "Premium Stay Add-on";
    const price = Math.max(50_000, Number(upsellPrice) || 250_000);
    const created: UpsellPackageMaster = {
      id: `UPS-${Date.now()}`,
      propertyId: targetPropertyForNew,
      category: upsellCategory,
      title: { vi: titleStr, en: titleStr, ko: titleStr },
      description: {
        vi: "Gói tiện ích cộng thêm giúp nâng cao trải nghiệm lưu trú của khách",
        en: "Optional stay enhancement offered automatically after booking confirmation",
        ko: "예약 확정 고객에게 자동 제안되는 맞춤형 부가 서비스",
      },
      priceVnd: price,
      pricingUnit:
        upsellCategory === "room_upgrade" ||
        upsellCategory === "breakfast_dining"
          ? "per_night"
          : "per_stay",
      orders30d: 0,
      extraRevenue30dVnd: 0,
      active: true,
    };

    setCreateUpsellOpen(false);
    setUpsellTitle("");
    onSaveMarketingCampaigns(
      {
        ...marketingCampaigns,
        upsellOffers: [created, ...marketingCampaigns.upsellOffers],
      },
      mCopy.common.savedToast,
    );
  };

  const kpiCards = [
    {
      id: "active",
      testId: "mkt-kpi-active",
      label: mk.kpiActiveCampaigns,
      value: String(vm.kpis.activeCampaignsCount),
      cls: "text-[#4F46E5]",
      bg: "bg-indigo-50",
      icon: <Megaphone className="w-[18px] h-[18px] text-[#4F46E5]" />,
    },
    {
      id: "rooms",
      testId: "mkt-kpi-sold",
      label: mk.kpiPromoRoomsSold,
      value: String(vm.kpis.promoRoomsSold30d),
      cls: "text-[#EA580C]",
      bg: "bg-orange-50",
      icon: <Flame className="w-[18px] h-[18px] text-[#EA580C]" />,
    },
    {
      id: "flashRev",
      testId: "mkt-kpi-flash-rev",
      label: mk.kpiFlashRevenue,
      value: vm.kpis.flashRevenue30dFormatted,
      cls: "text-[#16A34A]",
      bg: "bg-emerald-50",
      icon: <TrendingUp className="w-[18px] h-[18px] text-[#16A34A]" />,
    },
    {
      id: "upsellRev",
      testId: "mkt-kpi-upsell-rev",
      label: mk.kpiUpsellRevenue,
      value: vm.kpis.upsellRevenue30dFormatted,
      cls: "text-[#2563EB]",
      bg: "bg-blue-50",
      icon: <Sparkles className="w-[18px] h-[18px] text-[#2563EB]" />,
    },
  ];

  const categoryLabel = (cat: UpsellCategory) => {
    if (cat === "room_upgrade") return mk.categoryUpgrade;
    if (cat === "early_late") return mk.categoryEarlyLate;
    if (cat === "breakfast_dining") return mk.categoryDining;
    return mk.categoryTransfer;
  };

  return (
    <div data-testid="module-marketing-view" className="space-y-6 min-w-0">
      {/* Header + Sub-Tab Switcher + Primary Action */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-slate-900 m-0">
            {isDealsTab ? mk.dealsPageTitle : mk.upsellPageTitle}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-3xl">
            {isDealsTab ? mk.dealsPageSubtitle : mk.upsellPageSubtitle}
          </p>
        </div>

        <button
          type="button"
          data-testid={
            isDealsTab ? "open-create-deal-btn" : "open-create-upsell-btn"
          }
          onClick={() => {
            if (activeRole !== "manager") {
              onRequireManagerRole();
              return;
            }
            if (isDealsTab) setCreateDealOpen(true);
            else setCreateUpsellOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-2 text-[13px] font-semibold hover:bg-indigo-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>
            {isDealsTab
              ? mk.createDealBtn.replace(/^\+\s*/, "")
              : mk.createUpsellBtn.replace(/^\+\s*/, "")}
          </span>
        </button>
      </div>

      {/* Sub-module Pill Switcher synchronized with Sidebar Submenu */}
      <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-white border border-slate-200/90 p-1.5">
        <button
          type="button"
          data-testid="mkt-tab-deals"
          onClick={() => onChangeSubTab("marketing_deals")}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            isDealsTab
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {mk.tabFlashDeals}
        </button>
        <button
          type="button"
          data-testid="mkt-tab-upsell"
          onClick={() => onChangeSubTab("marketing_upsell")}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            !isDealsTab
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {mk.tabRoomUpsell}
        </button>
      </div>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 min-w-0">
        {kpiCards.map((k) => (
          <div
            key={k.id}
            data-testid={k.testId}
            className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-slate-500 truncate">
                {k.label}
              </span>
              <span
                className={`w-7 h-7 rounded-full ${k.bg} flex items-center justify-center shrink-0`}
              >
                {k.icon}
              </span>
            </div>
            <div
              className={`mt-2 text-[22px] font-bold tracking-tight tabular truncate ${k.cls}`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </section>

      {/* Content Grid: Flash Deals vs Room Upsells */}
      {isDealsTab ? (
        <section
          data-testid="mkt-deals-grid"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0"
        >
          {vm.flashDeals.map((deal) => (
            <div
              key={deal.id}
              data-testid={`flash-deal-card-${deal.id}`}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4 min-w-0"
            >
              <div className="space-y-2.5 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-bold text-orange-700 tabular">
                        -{deal.discountPct}%
                      </span>
                      <span className="text-[12px] font-semibold text-slate-500">
                        {deal.propertyShortName}
                      </span>
                    </div>
                    <h3 className="text-[15.5px] font-bold text-slate-900 m-0 leading-snug">
                      {deal.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11.5px] font-semibold ${
                        deal.active ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {deal.active
                        ? mCopy.common.activeBadge
                        : mCopy.common.pausedBadge}
                    </span>
                    <Switch
                      data-testid={`toggle-deal-${deal.id}`}
                      checked={deal.active}
                      onCheckedChange={(checked) =>
                        handleToggleDeal(deal.id, checked)
                      }
                    />
                  </div>
                </div>

                <p className="text-[12.5px] text-slate-600 m-0 leading-relaxed">
                  {deal.subtitle}
                </p>

                <div className="text-[12px] text-slate-700 font-medium">
                  {deal.roomTypeName} ·{" "}
                  <span className="text-indigo-600">
                    {deal.bookingWindowLabel}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {deal.perksLabels.map((pk) => (
                    <span
                      key={pk}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {pk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                <div>
                  <span className="line-through text-slate-400 tabular mr-2">
                    {deal.originalRateFormatted}
                  </span>
                  <span className="text-[15px] font-extrabold text-emerald-700 tabular">
                    {deal.dealRateFormatted}
                  </span>
                  <span className="text-slate-500 ml-1">
                    {mCopy.common.perNightSuffix}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-right tabular">
                  <div>
                    <div className="text-slate-400">{mk.quotaLabel}</div>
                    <div className="font-bold text-slate-800">
                      {deal.dailyRoomQuota}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">{mk.sold30dLabel}</div>
                    <div className="font-bold text-slate-800">
                      {deal.roomsSold30d}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">{mk.revenue30dLabel}</div>
                    <div className="font-bold text-[#16A34A]">
                      {deal.netRevenue30dFormatted}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section
          data-testid="mkt-upsell-grid"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0"
        >
          {vm.upsellOffers.map((up) => (
            <div
              key={up.id}
              data-testid={`upsell-card-${up.id}`}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4 min-w-0"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {categoryLabel(up.category)}
                      </span>
                      <span className="text-[12px] font-semibold text-slate-500">
                        {up.propertyShortName}
                      </span>
                    </div>
                    <h3 className="text-[15.5px] font-bold text-slate-900 m-0">
                      {up.title}
                    </h3>
                  </div>

                  <Switch
                    data-testid={`toggle-upsell-${up.id}`}
                    checked={up.active}
                    onCheckedChange={(checked) =>
                      handleToggleUpsell(up.id, checked)
                    }
                  />
                </div>

                <p className="text-[12.5px] text-slate-600 m-0 leading-relaxed">
                  {up.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                <div>
                  <span className="text-[15px] font-extrabold text-indigo-700 tabular">
                    +{up.priceFormatted}
                  </span>
                  <span className="text-slate-500 ml-1">
                    {up.pricingUnit === "per_night"
                      ? mCopy.common.perNightSuffix
                      : mCopy.common.perStaySuffix}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-right tabular">
                  <div>
                    <div className="text-slate-400">{mk.orders30dLabel}</div>
                    <div className="font-bold text-slate-900">
                      {up.orders30d}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">{mk.revenue30dLabel}</div>
                    <div className="font-bold text-[#16A34A]">
                      {up.extraRevenue30dFormatted}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Create Flash Deal Modal */}
      <Dialog open={createDealOpen} onOpenChange={setCreateDealOpen}>
        <DialogContent
          data-testid="create-deal-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-[17px] font-bold text-slate-900">
              {mk.dealModalTitle}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-slate-600">
              {mk.dealsPageSubtitle}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                {mk.fieldTitle}
              </label>
              <input
                type="text"
                data-testid="deal-title-input"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  {mk.fieldDiscountPct}
                </label>
                <input
                  type="number"
                  data-testid="deal-discount-input"
                  value={dealDiscountPct}
                  onChange={(e) => setDealDiscountPct(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold tabular"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  {mk.fieldOriginalRate}
                </label>
                <input
                  type="number"
                  step={50000}
                  value={dealOrigRate}
                  onChange={(e) => setDealOrigRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold tabular"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  {mk.fieldDailyQuota}
                </label>
                <input
                  type="number"
                  min={1}
                  value={dealQuota}
                  onChange={(e) => setDealQuota(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold tabular"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateDealOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700"
              >
                {mCopy.common.cancelBtn}
              </button>
              <button
                type="button"
                data-testid="confirm-create-deal-btn"
                onClick={handleCreateFlashDeal}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700"
              >
                {mCopy.common.saveBtn}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Upsell Offer Modal */}
      <Dialog open={createUpsellOpen} onOpenChange={setCreateUpsellOpen}>
        <DialogContent
          data-testid="create-upsell-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-[17px] font-bold text-slate-900">
              {mk.upsellModalTitle}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-slate-600">
              {mk.upsellPageSubtitle}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                {mk.fieldTitle}
              </label>
              <input
                type="text"
                data-testid="upsell-title-input"
                value={upsellTitle}
                onChange={(e) => setUpsellTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={upsellCategory}
                  onChange={(e) =>
                    setUpsellCategory(e.target.value as UpsellCategory)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800"
                >
                  <option value="room_upgrade">{mk.categoryUpgrade}</option>
                  <option value="early_late">{mk.categoryEarlyLate}</option>
                  <option value="breakfast_dining">{mk.categoryDining}</option>
                  <option value="airport_transfer">
                    {mk.categoryTransfer}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  {mk.fieldAddOnPrice}
                </label>
                <input
                  type="number"
                  step={20000}
                  data-testid="upsell-price-input"
                  value={upsellPrice}
                  onChange={(e) => setUpsellPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold tabular"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateUpsellOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700"
              >
                {mCopy.common.cancelBtn}
              </button>
              <button
                type="button"
                data-testid="confirm-create-upsell-btn"
                onClick={handleCreateUpsell}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700"
              >
                {mCopy.common.saveBtn}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
