import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { GoalWithNodes } from "@/types";
import { goalStatusMeta, nodeStatusMeta } from "@/lib/kairo/status";
import { ProgressHalo } from "./ProgressHalo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeDays, pct } from "@/lib/utils";

function nextNode(goal: GoalWithNodes) {
  const n = goal.nodes;
  return (
    n.find((x) => x.status === "in_motion") ??
    n.find((x) => x.status === "at_risk") ??
    n.find((x) => x.status === "not_started") ??
    null
  );
}

export function GoalCard({ goal, href }: { goal: GoalWithNodes; href?: string }) {
  const next = nextNode(goal);
  const gMeta = goalStatusMeta[goal.status];
  const done = goal.nodes.filter((n) => n.status === "done").length;

  return (
    <Link
      href={href ?? `/app/map?goal=${goal.id}`}
      className="panel group block rounded-2xl p-5 transition-all duration-200 hover:border-line-strong "
    >
      <div className="flex items-start gap-4">
        <ProgressHalo progress={goal.progress} size={52} hex={gMeta.hex}>
          <span className="font-mono text-[11px] font-semibold text-ink">{pct(goal.progress)}</span>
        </ProgressHalo>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate font-display text-[17px] font-semibold text-ink">{goal.title}</h3>
            <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-faint transition-colors group-hover:text-accent" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge meta={gMeta} />
            <span className="font-mono text-[11px] text-faint">
              {done}/{goal.nodes.length} steps
            </span>
            {goal.targetDate && <span className="font-mono text-[11px] text-faint">· {relativeDays(goal.targetDate)}</span>}
          </div>
        </div>
      </div>

      {next && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${nodeStatusMeta[next.status].dot}`} />
          <span className="font-mono text-[10px] uppercase tracking-wide text-faint">Next</span>
          <span className="truncate text-[13px] text-ink/90">{next.title}</span>
        </div>
      )}
    </Link>
  );
}
