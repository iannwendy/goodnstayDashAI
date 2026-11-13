import { CheckCircle2, Calendar, BedDouble, Building2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  formatBusinessMoney,
  type CurrencyCode,
  type OverviewCopy,
} from "@/lib/i18n";
import type { RecentBookingRow } from "@/services/overviewAnalytics";

interface BookingDetailModalProps {
  booking: RecentBookingRow | null;
  onClose: () => void;
  currency: CurrencyCode;
  copy: OverviewCopy;
}

export function BookingDetailModal({
  booking,
  onClose,
  currency,
  copy,
}: BookingDetailModalProps) {
  return (
    <Dialog open={Boolean(booking)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6">
        {booking && (
          <>
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                <DialogTitle className="text-[18px] font-bold text-slate-900 flex items-center gap-2">
                  <span>{copy.bookingModalTitle}</span>
                  <span className="text-indigo-600 tabular">
                    {booking.bookingCode}
                  </span>
                </DialogTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {copy.stateCompletedPaid}
                </span>
              </div>
              <DialogDescription className="text-[12.5px] text-slate-600">
                {copy.bookingModalSubtitle}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-3">
              {/* Property & Room Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{copy.bookingFieldProperty}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-slate-900">
                    {booking.propertyName}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 mb-1">
                    <BedDouble className="w-3.5 h-3.5" />
                    <span>{copy.bookingFieldRoom}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-slate-900">
                    {booking.roomName} · #{booking.roomNumber}
                  </div>
                </div>
              </div>

              {/* Stay Dates & Paid Timestamp */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {copy.bookingFieldStay}
                  </span>
                  <span className="font-semibold text-slate-900 tabular">
                    {booking.checkInLabel} → {booking.checkOutLabel} (
                    {booking.nights} {copy.bookingFieldNights})
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] pt-2 border-t border-slate-100">
                  <span className="text-slate-500">
                    {copy.bookingFieldPaidAt}
                  </span>
                  <span className="font-medium text-slate-800 tabular">
                    {booking.paidAtLabel}
                  </span>
                </div>
              </div>

              {/* Guest Note & Included Amenities */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2">
                <div>
                  <div className="text-[11.5px] font-medium text-slate-500 mb-0.5">
                    {copy.bookingFieldGuestNote}
                  </div>
                  <div className="text-[13px] text-slate-800">
                    {booking.guestNote}
                  </div>
                </div>
                {booking.amenities.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11.5px] font-medium text-slate-500 mb-1.5">
                      {copy.bookingFieldAmenities}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {booking.amenities.map((am) => (
                        <span
                          key={am}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-medium text-slate-700"
                        >
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Highlighted Net Payout */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/75 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-emerald-900 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    {copy.bookingFieldNetPayout}
                  </span>
                  <span className="text-[18px] font-bold text-emerald-700 tabular">
                    {formatBusinessMoney(booking.netRevenueVnd, currency)}
                  </span>
                </div>
                <p className="text-[11.5px] text-emerald-800/85 mt-1.5 mb-0 leading-relaxed">
                  {copy.bookingFieldPayoutNote}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors"
              >
                {copy.closeLabel}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
