import { useState, type ReactNode } from "react";
import {
  LayoutGrid,
  CalendarDays,
  Wallet,
  BedDouble,
  Gavel,
  MessageSquare,
  Megaphone,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  HelpCircle,
  Menu,
  X,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { AppLocale, CurrencyCode, OverviewCopy } from "@/lib/i18n";
import type {
  InboxMessageViewItem,
  InboxNotificationViewItem,
  PropertyFilterKey,
  PropertyOptionItem,
} from "@/services/overviewAnalytics";

interface PartnerHubShellProps {
  brandName: string;
  partnerUser: {
    displayName: string;
    initials: string;
    roleBadge: string;
  };
  inboxMessages: InboxMessageViewItem[];
  inboxNotifications: InboxNotificationViewItem[];
  locale: AppLocale;
  onChangeLocale: (next: AppLocale) => void;
  currency: CurrencyCode;
  onChangeCurrency: (next: CurrencyCode) => void;
  propertyKey: PropertyFilterKey;
  properties: PropertyOptionItem[];
  selectedProperty: PropertyOptionItem;
  onChangeProperty: (next: PropertyFilterKey) => void;
  copy: OverviewCopy;
  completedCount: number;
  children: ReactNode;
}

function BrandLogo({
  collapsed,
  brandName,
  brandSub,
}: {
  collapsed: boolean;
  brandName: string;
  brandSub: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden"
        aria-hidden="true"
      >
        <svg viewBox="0 0 36 36" className="w-7 h-7">
          <circle cx="18" cy="13" r="6" fill="#FDE68A" />
          <path
            d="M11 11.5C11 8.5 14 7 18 7C22 7 25 8.5 25 11.5H11Z"
            fill="#F59E0B"
          />
          <rect x="10" y="11" width="16" height="2" rx="1" fill="#FEF3C7" />
          <path
            d="M9.5 29C10.5 23.5 13.8 21 18 21C22.2 21 25.5 23.5 26.5 29H9.5Z"
            fill="#FFFFFF"
          />
          <path d="M16 21L18 25L20 21H16Z" fill="#F59E0B" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight min-w-0">
          <div className="text-[17px] font-bold tracking-tight text-blue-700 truncate">
            {brandName}
          </div>
          <div className="text-[11px] font-semibold text-amber-500 truncate">
            {brandSub}
          </div>
        </div>
      )}
    </div>
  );
}

function HotelThumbnail({ color }: { color: string }) {
  return (
    <span
      className="w-7 h-5 rounded-[5px] shrink-0 overflow-hidden inline-flex items-center justify-center border border-slate-200/80"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, #93c5fd 100%)`,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 28 20" className="w-full h-full">
        <rect x="4" y="6" width="11" height="12" rx="1" fill="#ffffff" fillOpacity="0.92" />
        <rect x="15" y="9" width="9" height="9" rx="1" fill="#e2e8f0" fillOpacity="0.9" />
        <rect x="6.5" y="8.5" width="2.2" height="2.2" fill={color} />
        <rect x="10.2" y="8.5" width="2.2" height="2.2" fill={color} />
        <rect x="6.5" y="12" width="2.2" height="2.2" fill={color} />
        <rect x="10.2" y="12" width="2.2" height="2.2" fill={color} />
      </svg>
    </span>
  );
}

export function PartnerHubShell({
  brandName,
  partnerUser,
  inboxMessages,
  inboxNotifications,
  locale,
  onChangeLocale,
  currency,
  onChangeCurrency,
  propertyKey,
  properties,
  selectedProperty,
  onChangeProperty,
  copy,
  completedCount,
  children,
}: PartnerHubShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [marketingExpanded, setMarketingExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<
    "messages" | "notifications" | null
  >(null);

  const triggerComingSoon = () => {
    setToastMessage(copy.navComingSoonNotice);
    setMobileMenuOpen(false);
  };

  const navItems = [
    {
      id: "overview",
      testId: "nav-item-overview",
      label: copy.navOverview,
      icon: LayoutGrid,
      active: true,
    },
    {
      id: "calendar",
      testId: "nav-item-calendar",
      label: copy.navCalendar,
      icon: CalendarDays,
      active: false,
    },
    {
      id: "payout",
      testId: "nav-item-payout",
      label: copy.navPayout,
      icon: Wallet,
      active: false,
    },
    {
      id: "rooms",
      testId: "nav-item-rooms",
      label: copy.navRooms,
      icon: BedDouble,
      active: false,
    },
    {
      id: "bidding",
      testId: "nav-item-bidding",
      label: copy.navBidding,
      icon: Gavel,
      active: false,
    },
    {
      id: "messages",
      testId: "nav-item-messages",
      label: copy.navMessages,
      icon: MessageSquare,
      active: false,
    },
  ];

  const renderSidebarLinks = (
    isCollapsedMode: boolean,
    testIdPrefix = "",
  ) => (
    <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            data-testid={`${testIdPrefix}${item.testId}`}
            title={isCollapsedMode ? item.label : undefined}
            onClick={() => {
              if (!item.active) triggerComingSoon();
              else setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center ${
              isCollapsedMode ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
            } rounded-lg text-[13.5px] font-medium transition-colors ${
              item.active
                ? "bg-[#EEF2FF] text-[#4F46E5] font-semibold"
                : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`w-[18px] h-[18px] shrink-0 ${
                item.active ? "text-[#4F46E5]" : "text-slate-500"
              }`}
            />
            {!isCollapsedMode && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}

      {/* Marketing with expandable chevron matching demo_new/2.png */}
      <div>
        <button
          type="button"
          data-testid={`${testIdPrefix}nav-item-marketing`}
          title={isCollapsedMode ? copy.navMarketing : undefined}
          onClick={() => {
            if (isCollapsedMode) {
              triggerComingSoon();
            } else {
              setMarketingExpanded((prev) => !prev);
            }
          }}
          className={`w-full flex items-center ${
            isCollapsedMode
              ? "justify-center px-2 py-2.5"
              : "justify-between px-3 py-2.5"
          } rounded-lg text-[13.5px] font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <Megaphone className="w-[18px] h-[18px] shrink-0 text-slate-500" />
            {!isCollapsedMode && (
              <span className="truncate">{copy.navMarketing}</span>
            )}
          </span>
          {!isCollapsedMode && (
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                marketingExpanded ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {!isCollapsedMode && marketingExpanded && (
          <div
            data-testid={`${testIdPrefix}nav-marketing-submenu`}
            className="mt-1 ml-7 pl-2.5 border-l border-slate-200 space-y-1"
          >
            <button
              type="button"
              onClick={triggerComingSoon}
              className="w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {copy.navMarketingSubDeals}
            </button>
            <button
              type="button"
              onClick={triggerComingSoon}
              className="w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {copy.navMarketingSubUpsell}
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        type="button"
        data-testid={`${testIdPrefix}nav-item-logout`}
        title={isCollapsedMode ? copy.navLogout : undefined}
        onClick={triggerComingSoon}
        className={`w-full flex items-center ${
          isCollapsedMode ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
        } rounded-lg text-[13.5px] font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors`}
      >
        <LogOut className="w-[18px] h-[18px] shrink-0 text-slate-500" />
        {!isCollapsedMode && <span className="truncate">{copy.navLogout}</span>}
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex w-full max-w-full overflow-x-clip">
      {/* Desktop Left Sidebar (>=1024px) */}
      <aside
        data-testid="sidebar-nav"
        data-collapsed={sidebarCollapsed ? "true" : "false"}
        className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-slate-200/90 sticky top-0 h-screen transition-[width] duration-200 z-20 ${
          sidebarCollapsed ? "w-[64px]" : "w-[244px]"
        }`}
      >
        <div
          className={`h-16 border-b border-slate-100 flex items-center ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {!sidebarCollapsed && (
            <BrandLogo
              collapsed={false}
              brandName={brandName}
              brandSub={copy.brandSub}
            />
          )}
          <button
            type="button"
            data-testid="sidebar-collapse-btn"
            aria-label={
              sidebarCollapsed
                ? copy.expandSidebarLabel
                : copy.collapseSidebarLabel
            }
            title={
              sidebarCollapsed
                ? copy.expandSidebarLabel
                : copy.collapseSidebarLabel
            }
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {renderSidebarLinks(sidebarCollapsed)}
      </aside>

      {/* Mobile Navigation Drawer (<1024px) */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent
          data-testid="mobile-sidebar-drawer"
          className="fixed inset-y-0 left-0 top-0 translate-x-0 translate-y-0 h-dvh max-h-dvh w-[280px] max-w-[86vw] p-0 gap-0 rounded-none rounded-r-2xl overflow-y-auto flex flex-col justify-start"
        >
          <DialogHeader className="px-4 py-3.5 border-b border-slate-100 text-left shrink-0">
            <DialogTitle className="sr-only">{copy.openMenuLabel}</DialogTitle>
            <DialogDescription className="sr-only">
              {brandName} {copy.brandSub}
            </DialogDescription>
            <BrandLogo
              collapsed={false}
              brandName={brandName}
              brandSub={copy.brandSub}
            />
          </DialogHeader>
          <div className="py-1 flex-1 overflow-y-auto">
            {renderSidebarLinks(false, "mobile-")}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="min-h-16 bg-white border-b border-slate-200/90 px-3 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-10">
          {/* Left: Mobile Hamburger + Hotel Switcher */}
          <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
            <button
              type="button"
              data-testid="mobile-menu-btn"
              aria-label={copy.openMenuLabel}
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="relative flex items-center min-w-0 flex-1 sm:flex-initial sm:w-[275px] bg-white border border-slate-200/95 rounded-lg pl-2.5 pr-7 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300 transition-colors">
              <HotelThumbnail color={selectedProperty.badgeColor} />
              <select
                data-testid="topbar-property-select"
                aria-label="Property selector"
                value={propertyKey}
                onChange={(e) =>
                  onChangeProperty(e.target.value as PropertyFilterKey)
                }
                className="appearance-none bg-transparent border-0 text-[13px] font-semibold text-slate-800 pl-2 pr-2 py-0.5 w-full min-w-0 truncate focus:outline-none"
              >
                {properties.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5" />
            </div>
          </div>

          {/* Right: Language + Currency + Utility Icons + Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
            {/* Language Switcher */}
            <div className="relative flex items-center">
              <select
                data-testid="topbar-language-select"
                aria-label="Language"
                value={locale}
                onChange={(e) => onChangeLocale(e.target.value as AppLocale)}
                className="appearance-none bg-white border border-slate-200/95 rounded-lg pl-3 pr-7 py-1.5 text-[12.5px] font-medium text-slate-700 hover:border-slate-300 focus:outline-none"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
                <option value="ko">한국어</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2" />
            </div>

            {/* Currency Switcher */}
            <div className="relative flex items-center">
              <select
                data-testid="topbar-currency-select"
                aria-label="Currency"
                value={currency}
                onChange={(e) =>
                  onChangeCurrency(e.target.value as CurrencyCode)
                }
                className="appearance-none bg-white border border-slate-200/95 rounded-lg pl-3 pr-7 py-1.5 text-[12.5px] font-medium text-slate-700 hover:border-slate-300 focus:outline-none"
              >
                <option value="VND">VND</option>
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2" />
            </div>

            {/* Utility Icons (reachable across both mobile and desktop) */}
            <div className="flex items-center gap-0.5 sm:gap-1 relative">
              <button
                type="button"
                data-testid="topbar-messages-btn"
                aria-label={copy.messagesTitle}
                onClick={() =>
                  setActivePopover((p) => (p === "messages" ? null : "messages"))
                }
                className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
              >
                <MessageSquare className="w-[17px] h-[17px]" />
                {inboxMessages.some((m) => m.unread) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute top-1.5 right-1.5" />
                )}
              </button>

              <button
                type="button"
                data-testid="topbar-notifications-btn"
                aria-label={copy.notificationsTitle}
                onClick={() =>
                  setActivePopover((p) =>
                    p === "notifications" ? null : "notifications",
                  )
                }
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
              >
                <Bell className="w-[17px] h-[17px]" />
                {(completedCount > 0 || inboxNotifications.length > 0) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-2" />
                )}
              </button>

              <button
                type="button"
                data-testid="topbar-help-btn"
                aria-label={copy.helpTitle}
                onClick={() => {
                  setActivePopover(null);
                  setHelpOpen(true);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <HelpCircle className="w-[17px] h-[17px]" />
              </button>

              {/* Messages / Notifications Popover */}
              {activePopover === "messages" && (
                <div
                  data-testid="messages-popover"
                  className="fixed left-3 right-3 top-28 sm:absolute sm:left-auto sm:right-0 sm:top-10 sm:w-80 rounded-xl bg-white border border-slate-200 shadow-lg p-3.5 z-30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12.5px] font-semibold text-slate-900">
                      {copy.messagesTitle}
                    </span>
                    <button
                      type="button"
                      aria-label={copy.closeLabel}
                      onClick={() => setActivePopover(null)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {inboxMessages.length === 0 ? (
                    <p className="text-[12px] text-slate-500 m-0">
                      {copy.messagesEmpty}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {inboxMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg border p-2.5 text-[12px] min-w-0 ${
                            msg.unread
                              ? "bg-indigo-50/60 border-indigo-100"
                              : "bg-slate-50/70 border-slate-200/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-slate-900 truncate">
                              {msg.guestName}{" "}
                              <span className="text-indigo-600 tabular">
                                {msg.bookingCode}
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-400 tabular shrink-0">
                              {msg.receivedAt}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-snug m-0 break-words">
                            {msg.preview}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activePopover === "notifications" && (
                <div
                  data-testid="notifications-popover"
                  className="fixed left-3 right-3 top-28 sm:absolute sm:left-auto sm:right-0 sm:top-10 sm:w-80 rounded-xl bg-white border border-slate-200 shadow-lg p-3.5 z-30 space-y-2.5 max-h-80 overflow-y-auto"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold text-slate-900">
                      {copy.notificationsTitle}
                    </span>
                    <button
                      type="button"
                      aria-label={copy.closeLabel}
                      onClick={() => setActivePopover(null)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {completedCount > 0 && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 p-2.5 text-[12px] text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words">
                        {locale === "vi"
                          ? `Đang ghi nhận ${completedCount} đơn đặt phòng đã thanh toán đủ 100% trong kỳ đang xem.`
                          : locale === "ko"
                            ? `선택한 기간 동안 ${completedCount}건의 100% 결제 완료 예약이 확인되었습니다.`
                            : `${completedCount} completed and prepaid bookings recorded in this period.`}
                      </span>
                    </div>
                  )}
                  {inboxNotifications.map((item) => {
                    const boxCls =
                      item.tone === "emerald"
                        ? "bg-emerald-50/70 border-emerald-100"
                        : item.tone === "amber"
                          ? "bg-amber-50/75 border-amber-200/80"
                          : "bg-indigo-50/60 border-indigo-100";
                    const IconComp =
                      item.tone === "emerald"
                        ? CheckCircle2
                        : item.tone === "amber"
                          ? AlertCircle
                          : Sparkles;
                    const iconCls =
                      item.tone === "emerald"
                        ? "text-emerald-600"
                        : item.tone === "amber"
                          ? "text-amber-600"
                          : "text-indigo-600";
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-[12px] text-slate-700 ${boxCls}`}
                      >
                        <IconComp
                          className={`w-4 h-4 shrink-0 mt-0.5 ${iconCls}`}
                        />
                        <span className="min-w-0 break-words">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200/80">
              <span className="hidden md:inline text-[13px] font-medium text-slate-700">
                {partnerUser.displayName}
              </span>
              <div
                data-testid="topbar-user-avatar"
                title={`${partnerUser.displayName} · ${partnerUser.roleBadge}`}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white text-[11.5px] font-bold flex items-center justify-center shrink-0 ring-2 ring-slate-100"
              >
                {partnerUser.initials}
              </div>
            </div>
          </div>
        </header>

        {/* Polite Floating Notice Toast */}
        {toastMessage && (
          <div
            data-testid="hub-toast-banner"
            role="status"
            className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-xl border border-indigo-200 bg-indigo-50/95 px-4 py-2.5 flex items-center justify-between gap-3 text-[13px] text-indigo-950 shadow-sm"
          >
            <span>{toastMessage}</span>
            <button
              type="button"
              data-testid="hub-toast-close"
              aria-label={copy.closeLabel}
              onClick={() => setToastMessage(null)}
              className="px-2 py-0.5 rounded-md text-[12px] font-semibold text-indigo-700 hover:bg-indigo-100 shrink-0"
            >
              {copy.closeLabel}
            </button>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 min-w-0 w-full max-w-[1260px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Plain-Business Quick Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-[17px] font-bold text-slate-900">
              {copy.helpTitle}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600">
              {copy.helpSubtitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {copy.helpItems.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5"
              >
                <div className="text-[13.5px] font-semibold text-slate-900 mb-1">
                  {item.title}
                </div>
                <p className="text-[12.5px] text-slate-600 leading-relaxed m-0">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800"
            >
              {copy.closeLabel}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
