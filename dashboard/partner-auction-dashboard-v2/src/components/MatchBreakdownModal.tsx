import {
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Gift,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MasterDataBundle } from "@/data";
import { resolveMatchBreakdown } from "@/services/analyticsEngine";

interface MatchBreakdownModalProps {
  reqId: string | null;
  bundle: MasterDataBundle;
  isLiveSession?: boolean;
  onClose: () => void;
  onOpenCustomBidWithPerk?: (reqId: string, perkId?: string) => void;
}

export function MatchBreakdownModal({
  reqId,
  bundle,
  isLiveSession,
  onClose,
  onOpenCustomBidWithPerk,
}: MatchBreakdownModalProps) {
  if (!reqId) return null;

  const data = resolveMatchBreakdown(reqId, bundle);

  return (
    <Dialog open={Boolean(reqId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-5 gap-3.5">
        <DialogHeader className="border-b border-zinc-200 pb-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-sm text-zinc-950">
                Điểm Khớp Yêu Cầu (AI Match %)
              </DialogTitle>
              <DialogDescription className="text-[11px] text-zinc-500 mt-0.5">
                {data.sub}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formula & Score Card */}
        <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono text-zinc-500">
              Công thức: 100% − Điểm trừ tiêu chí thiếu + Đặc quyền bù
            </div>
            <div className="font-semibold text-xs text-zinc-900 mt-1">
              {data.title}
            </div>
            <div className="w-44 rounded-full h-1.5 mt-2 overflow-hidden bg-zinc-200">
              <div
                className={`h-1.5 rounded-full ${
                  data.score >= 90
                    ? "bg-emerald-500"
                    : data.score >= 80
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${data.score}%` }}
              />
            </div>
          </div>
          <span
            className={`text-3xl font-bold font-mono ${
              data.score >= 90
                ? "text-emerald-600"
                : data.score >= 80
                  ? "text-amber-600"
                  : "text-rose-600"
            }`}
          >
            {data.score}%
          </span>
        </div>

        {/* Criteria Checklist */}
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
          {data.items.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg border border-zinc-200 bg-white flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {item.status === "match" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : item.status === "warn" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </span>
                <div>
                  <div className="text-xs font-semibold text-zinc-900">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Khách: <strong className="text-zinc-800">{item.guest}</strong>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    KS: <strong className="text-zinc-800">{item.hotel}</strong>
                  </div>
                </div>
              </div>
              <Badge
                variant={
                  item.status === "match"
                    ? "success"
                    : item.status === "warn"
                      ? "warning"
                      : "danger"
                }
                className="shrink-0 text-[10px]"
              >
                {item.label}
              </Badge>
            </div>
          ))}
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 text-[11px] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-zinc-600 shrink-0" />
          <span>{data.tip}</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          {isLiveSession &&
            data.suggestedPerkId &&
            onOpenCustomBidWithPerk && (
              <Button
                variant="emerald"
                size="sm"
                onClick={() => {
                  const targetReq = reqId;
                  const perkId = data.suggestedPerkId;
                  onClose();
                  onOpenCustomBidWithPerk(targetReq, perkId);
                }}
              >
                <Gift className="w-3.5 h-3.5" />
                Tặng Đặc Quyền Bù Điểm
              </Button>
            )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
