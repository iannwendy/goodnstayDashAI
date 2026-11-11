import { useState, useEffect } from "react";
import { ShieldAlert, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  calcGuestTotalFromBase,
  formatFullVnd,
  type HotelProfileMaster,
  type PerkOption,
  type LiveSession,
  type UserRole,
} from "@/data";

interface CustomBidModalProps {
  session: LiveSession | null;
  hotelProfile: HotelProfileMaster;
  perksCatalog: PerkOption[];
  initialSuggestedPerkId?: string;
  activeFloorPrice: number;
  autoBidEnabled: boolean;
  userRole: UserRole;
  canOverrideFloor: boolean;
  onDisableAutoBid?: () => void;
  onClose: () => void;
  onSubmitBid: (
    sessionId: string,
    basePrice: number,
    selectedPerks: string[],
  ) => void;
}

export function CustomBidModal({
  session,
  hotelProfile,
  perksCatalog,
  initialSuggestedPerkId,
  activeFloorPrice,
  autoBidEnabled,
  userRole,
  canOverrideFloor,
  onDisableAutoBid,
  onClose,
  onSubmitBid,
}: CustomBidModalProps) {
  const [priceInput, setPriceInput] = useState<string>("850000");
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [managerOverrideConfirmed, setManagerOverrideConfirmed] =
    useState<boolean>(false);

  useEffect(() => {
    if (session) {
      setPriceInput(
        String(
          session.bidSubmitted?.basePrice ?? session.aiSuggestedBasePrice,
        ),
      );
      const defaults = session.bidSubmitted
        ? session.bidSubmitted.perks
        : perksCatalog
            .filter(
              (p) => p.defaultChecked || p.id === initialSuggestedPerkId,
            )
            .map((p) => p.label);
      setSelectedPerks(defaults);
      setManagerOverrideConfirmed(false);
    }
  }, [session?.id, session?.aiSuggestedBasePrice, initialSuggestedPerkId, perksCatalog]);

  if (!session) return null;

  const effectiveFloor = session.effectiveFloorPrice || activeFloorPrice;
  const isExpiredTtl = session.remainingSeconds <= 0;
  const isNoVacancy = session.vacantForStay <= 0;
  const numericBase = Number(priceInput) || 0;
  const isBelowFloor = numericBase < effectiveFloor;
  const isBlockedByAutoBidFloor = isBelowFloor && autoBidEnabled;
  const canManagerOverride =
    isBelowFloor && !autoBidEnabled && canOverrideFloor;
  const canSubmit =
    !isExpiredTtl &&
    !isNoVacancy &&
    numericBase > 0 &&
    (!isBelowFloor || (canManagerOverride && managerOverrideConfirmed));

  const totalHotelBase = numericBase * session.nights * session.roomsQty;
  const totalGuestPaid = calcGuestTotalFromBase(
    totalHotelBase,
    hotelProfile.guestPriceMultiplier,
  );
  const feeAndVatAmount = totalGuestPaid - totalHotelBase;

  const togglePerk = (label: string) => {
    setSelectedPerks((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label],
    );
  };

  return (
    <Dialog open={Boolean(session)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 gap-4">
        <DialogHeader className="border-b border-zinc-200 pb-3 text-left">
          <DialogTitle className="font-semibold text-base text-zinc-950">
            Gửi Báo Giá 1 Lần (One-Shot) & Đặc Quyền
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 mt-0.5">
            Phiên:{" "}
            <strong className="font-mono text-zinc-900">#{session.id}</strong> •
            Hạng khớp:{" "}
            <strong className="text-zinc-900">{session.matchedRoomName}</strong>{" "}
            ({session.nights} đêm • Hiệu lực 60 phút)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {isNoVacancy && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-[11px]">
              <strong>Tạm hết phòng trống ngày lưu trú:</strong> Vui lòng mở khóa
              ít nhất 1 buồng hạng {session.matchedRoomName} trước khi gửi báo giá.
            </div>
          )}

          <div>
            <label
              htmlFor="customPriceInput"
              className="block font-medium text-zinc-800 mb-1.5"
            >
              Giá gốc Khách sạn nhận 100% (VNĐ / đêm):
            </label>
            <Input
              id="customPriceInput"
              type="number"
              step={50000}
              min={100000}
              value={priceInput}
              onChange={(e) => {
                setPriceInput(e.target.value);
                setManagerOverrideConfirmed(false);
              }}
              className={`h-10 rounded-lg font-semibold font-mono text-base ${
                isBelowFloor
                  ? "border-rose-400 bg-rose-50/40 text-rose-700"
                  : "border-zinc-200 text-zinc-950"
              }`}
            />
            <div className="flex items-center justify-between mt-1.5 text-[11px]">
              <span className="text-zinc-500">
                Sàn hạng {session.mandatoryRoomCategory}
                {session.flashDiscountApplied
                  ? ` (Xả đêm -${hotelProfile.nightFlashDiscountPct}%)`
                  : ""}
                :{" "}
                <strong className="font-mono text-zinc-900">
                  {formatFullVnd(effectiveFloor)}
                </strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  setPriceInput(String(session.aiSuggestedBasePrice))
                }
                className="text-zinc-900 hover:underline font-medium cursor-pointer"
              >
                Đặt theo AI ({formatFullVnd(session.aiSuggestedBasePrice)})
              </button>
            </div>
          </div>

          {isBelowFloor && (
            <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-950 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-rose-800">
                    Cảnh báo Bảo vệ Giá sàn (Floor Guardrail):
                  </strong>{" "}
                  Giá gốc{" "}
                  <span className="font-mono font-semibold text-rose-700">
                    {formatFullVnd(numericBase)}
                  </span>{" "}
                  thấp hơn Giá sàn hạng {session.matchedRoomName} (
                  {formatFullVnd(effectiveFloor)}).
                  {isBlockedByAutoBidFloor && (
                    <span className="block mt-1 font-medium text-rose-700">
                      Khi đang BẬT Auto-Bid, hệ thống khóa cứng không cho phép
                      báo dưới sàn.{" "}
                      {canOverrideFloor && onDisableAutoBid && (
                        <button
                          type="button"
                          onClick={onDisableAutoBid}
                          className="underline font-semibold text-zinc-950 hover:text-rose-900 cursor-pointer"
                        >
                          Tắt Auto-Bid ngay để Quản lý duyệt
                        </button>
                      )}
                    </span>
                  )}
                  {!autoBidEnabled && userRole === "receptionist" && (
                    <span className="block mt-1 font-medium text-rose-700">
                      Tài khoản Lễ tân không có quyền duyệt dưới sàn. Vui lòng
                      nhập &ge; {formatFullVnd(effectiveFloor)} hoặc chuyển
                      quyền Quản lý ở góc trên bên phải.
                    </span>
                  )}
                </div>
              </div>

              {canManagerOverride && (
                <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11px] font-semibold text-rose-900">
                  <input
                    type="checkbox"
                    checked={managerOverrideConfirmed}
                    onChange={(e) =>
                      setManagerOverrideConfirmed(e.target.checked)
                    }
                    className="rounded border-rose-400 accent-zinc-950"
                  />
                  <span>
                    Tôi (Chủ/Quản lý) xác nhận chủ động duyệt mức giá dưới sàn
                    này
                  </span>
                </label>
              )}
            </div>
          )}

          <div>
            <label className="block font-medium text-zinc-800 mb-1.5">
              Đính kèm đặc quyền mềm (Từ bảng perks_catalog.json):
            </label>
            <div className="space-y-1.5">
              {perksCatalog.map((perk) => {
                const checked = selectedPerks.includes(perk.label);
                return (
                  <label
                    key={perk.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      checked
                        ? "bg-zinc-50 border-zinc-900 text-zinc-950"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerk(perk.label)}
                        className="rounded accent-zinc-950"
                      />
                      <div>
                        <span className="font-medium block">{perk.label}</span>
                        <span className="text-[10px] text-zinc-500">
                          {perk.costEstimate}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      +{perk.winBoostPct}% thắng
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                KS nhận 100% Giá gốc ({session.nights} đêm • 0% hoa hồng):
              </span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                {formatFullVnd(totalHotelBase)}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-500 pt-1 border-t border-zinc-200/80">
              <span>
                Khách thanh toán (Gồm +15% phí sàn & +10% VAT ={" "}
                {formatFullVnd(feeAndVatAmount)}):
              </span>
              <strong className="font-mono text-zinc-800">
                {formatFullVnd(totalGuestPaid)}
              </strong>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9">
            Đóng
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onSubmitBid(session.id, numericBase, selectedPerks);
              onClose();
            }}
            className="flex-1 h-9"
          >
            <Check className="w-4 h-4 mr-1" />
            Gửi báo giá 1 lần
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
