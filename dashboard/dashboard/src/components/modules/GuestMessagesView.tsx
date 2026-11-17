import { useEffect, useState } from "react";
import {
  MessageSquare,
  MailWarning,
  CheckCircle2,
  Clock,
  Send,
  Search,
  Eye,
  Phone,
} from "lucide-react";
import type { HubInboxMaster } from "@/data";
import type { HubModulesCopy } from "@/lib/hubModulesI18n";
import type { MessagesModuleViewModel } from "@/services/hubModulesAnalytics";

interface GuestMessagesViewProps {
  vm: MessagesModuleViewModel;
  hubInbox: HubInboxMaster;
  mCopy: HubModulesCopy;
  onOpenBookingByRef: (refOrCode: string) => void;
  onSaveHubInbox: (next: HubInboxMaster, notice?: string) => void;
}

export function GuestMessagesView({
  vm,
  hubInbox,
  mCopy,
  onOpenBookingByRef,
  onSaveHubInbox,
}: GuestMessagesViewProps) {
  const m = mCopy.messages;

  const [filterKey, setFilterKey] = useState<"all" | "unread" | "replied">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    vm.conversations[0]?.id ?? null,
  );
  const [replyDraft, setReplyDraft] = useState("");

  const filteredConversations = vm.conversations.filter((c) => {
    if (filterKey === "unread" && !c.unread) return false;
    if (filterKey === "replied" && c.unread) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        c.guestName.toLowerCase().includes(q) ||
        c.bookingCode.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  useEffect(() => {
    if (
      filteredConversations.length > 0 &&
      !filteredConversations.some((c) => c.id === selectedId)
    ) {
      setSelectedId(filteredConversations[0].id);
    } else if (filteredConversations.length === 0) {
      setSelectedId(null);
    }
  }, [filteredConversations, selectedId]);

  const activeThread =
    filteredConversations.find((c) => c.id === selectedId) ?? null;

  const handleToggleReadState = (msgId: string, nextUnread: boolean) => {
    const nextInbox: HubInboxMaster = {
      ...hubInbox,
      messages: hubInbox.messages.map((item) =>
        item.id === msgId
          ? {
              ...item,
              unread: nextUnread,
              status: nextUnread ? "needs_reply" : "replied",
            }
          : item,
      ),
    };
    onSaveHubInbox(nextInbox, mCopy.common.savedToast);
  };

  const handleSendReply = (overrideText?: string) => {
    if (!activeThread) return;
    const text = (overrideText ?? replyDraft).trim();
    if (!text) return;

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    const nextInbox: HubInboxMaster = {
      ...hubInbox,
      messages: hubInbox.messages.map((item) => {
        if (item.id !== activeThread.id) return item;
        const existingThread =
          item.thread && item.thread.length > 0
            ? item.thread
            : [
                {
                  id: `${item.id}-init`,
                  sender: "guest" as const,
                  sentAt: item.receivedAt,
                  body: item.preview,
                },
              ];
        return {
          ...item,
          unread: false,
          status: "replied",
          preview: {
            vi: text,
            en: text,
            ko: text,
          },
          thread: [
            ...existingThread,
            {
              id: `TH-${Date.now()}`,
              sender: "hotel",
              sentAt: hhmm,
              body: {
                vi: text,
                en: text,
                ko: text,
              },
            },
          ],
        };
      }),
    };
    setReplyDraft("");
    onSaveHubInbox(nextInbox, mCopy.common.savedToast);
  };

  const kpiCards = [
    {
      id: "total",
      testId: "msg-kpi-total",
      label: m.kpiTotalThreads,
      value: String(vm.kpis.totalThreads),
      cls: "text-slate-900",
      bg: "bg-slate-100",
      icon: <MessageSquare className="w-[18px] h-[18px] text-slate-700" />,
    },
    {
      id: "unread",
      testId: "msg-kpi-unread",
      label: m.kpiUnread,
      value: String(vm.kpis.unreadCount),
      cls: "text-[#DC2626]",
      bg: "bg-red-50",
      icon: <MailWarning className="w-[18px] h-[18px] text-[#DC2626]" />,
    },
    {
      id: "replied",
      testId: "msg-kpi-replied",
      label: m.kpiReplied,
      value: String(vm.kpis.repliedCount),
      cls: "text-[#16A34A]",
      bg: "bg-emerald-50",
      icon: <CheckCircle2 className="w-[18px] h-[18px] text-[#16A34A]" />,
    },
    {
      id: "speed",
      testId: "msg-kpi-speed",
      label: m.kpiAvgResponse,
      value: m.avgResponseValue,
      cls: "text-[#4F46E5]",
      bg: "bg-indigo-50",
      icon: <Clock className="w-[18px] h-[18px] text-[#4F46E5]" />,
    },
  ];

  return (
    <div data-testid="module-messages-view" className="space-y-6 min-w-0">
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-slate-900 m-0">
          {m.pageTitle}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-3xl">
          {m.pageSubtitle}
        </p>
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

      {/* Main 2-Pane Responsive Inbox */}
      {vm.conversations.length === 0 ? (
        <section
          data-testid="messages-empty-state"
          className="rounded-2xl border border-slate-200/90 bg-white py-14 px-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="text-[15px] font-bold text-slate-800">
            {m.emptyInboxTitle}
          </div>
          <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-md mx-auto">
            {m.emptyInboxDesc}
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
          {/* Left Thread List */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col gap-3 min-w-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                data-testid="messages-search-input"
                placeholder={m.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-[12.5px] text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "unread", "replied"] as const).map((fk) => {
                const lbl =
                  fk === "all"
                    ? mCopy.common.allFilter
                    : fk === "unread"
                      ? m.filterUnread
                      : m.filterReplied;
                return (
                  <button
                    key={fk}
                    type="button"
                    data-testid={`messages-filter-${fk}`}
                    onClick={() => setFilterKey(fk)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                      filterKey === fk
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === activeThread?.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    data-testid={`thread-item-${conv.id}`}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors min-w-0 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/55"
                        : conv.unread
                          ? "border-indigo-200 bg-white hover:bg-slate-50"
                          : "border-slate-200/80 bg-slate-50/40 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {conv.unread && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 text-[13px] truncate">
                          {conv.guestName}
                        </span>
                        <span className="font-bold text-indigo-600 text-[12.5px] tabular shrink-0">
                          {conv.bookingCode}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular shrink-0">
                        {conv.receivedAt}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[11px]">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                        {conv.propertyShortName}
                      </span>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
                        {conv.topicTag}
                      </span>
                    </div>

                    <p className="text-[12px] text-slate-600 line-clamp-2 m-0 break-words">
                      {conv.preview}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Conversation Detail & Reply Composer */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4 min-w-0">
            {activeThread ? (
              <>
                <div className="space-y-4 min-w-0">
                  {/* Thread Header */}
                  <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[16px] font-bold text-slate-900">
                          {activeThread.guestName}
                        </span>
                        <span className="font-bold text-indigo-600 tabular">
                          {activeThread.bookingCode}
                        </span>
                      </div>
                      <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{activeThread.propertyShortName}</span>
                        <span>·</span>
                        <span>{activeThread.staySummary}</span>
                        <span className="inline-flex items-center gap-1 tabular">
                          <Phone className="w-3 h-3" />
                          {activeThread.guestPhone}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        data-testid="toggle-read-btn"
                        onClick={() =>
                          handleToggleReadState(
                            activeThread.id,
                            !activeThread.unread,
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {activeThread.unread ? m.markReadBtn : m.markUnreadBtn}
                      </button>

                      {activeThread.linkedBookingRefId && (
                        <button
                          type="button"
                          data-testid="msg-open-booking-btn"
                          onClick={() =>
                            onOpenBookingByRef(activeThread.linkedBookingRefId!)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[11.5px] font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{m.viewLinkedBookingBtn}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages Bubble Stream */}
                  <div
                    data-testid="active-thread-messages"
                    className="space-y-3 max-h-[280px] overflow-y-auto pr-1"
                  >
                    {activeThread.thread.map((bubble) => {
                      const isHotel = bubble.sender === "hotel";
                      return (
                        <div
                          key={bubble.id}
                          className={`flex flex-col ${
                            isHotel ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="text-[11px] text-slate-400 mb-1 px-1">
                            {isHotel ? m.senderHotel : m.senderGuest} ·{" "}
                            {bubble.sentAt}
                          </div>
                          <div
                            className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
                              isHotel
                                ? "bg-indigo-600 text-white rounded-br-sm"
                                : "bg-slate-100 text-slate-800 rounded-bl-sm"
                            }`}
                          >
                            {bubble.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Reply Templates + Composer */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  {vm.quickReplies.length > 0 && (
                    <div>
                      <div className="text-[11.5px] font-semibold text-slate-500 mb-1.5">
                        {m.quickReplyHeading}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {vm.quickReplies.map((qr) => (
                          <button
                            key={qr.id}
                            type="button"
                            data-testid={`quick-reply-${qr.id}`}
                            onClick={() => setReplyDraft(qr.template)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1 text-[11.5px] font-medium text-indigo-700 hover:bg-indigo-100 text-left"
                          >
                            {qr.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <textarea
                      rows={2}
                      data-testid="message-reply-input"
                      placeholder={m.replyPlaceholder}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                    <button
                      type="button"
                      data-testid="message-send-reply-btn"
                      disabled={!replyDraft.trim()}
                      onClick={() => handleSendReply()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-45 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span>{m.sendReplyBtn}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
