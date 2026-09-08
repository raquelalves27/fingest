import { Lightbulb } from "lucide-react";
import { type Insight } from "@/modules/insights/api";

export function InsightsSection({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="rounded-card border border-paper-border dark:border-ink-border bg-paper-soft dark:bg-ink-soft p-5 shadow-soft">
      <h3 className="text-sm font-medium text-olive mb-3 flex items-center gap-2">
        <Lightbulb size={15} />
        Insights
      </h3>
      <div className="space-y-2.5">
        {insights.map((insight, idx) => (
          <p key={idx} className="text-sm text-ink dark:text-paper leading-relaxed">
            {insight.text}
          </p>
        ))}
      </div>
    </div>
  );
}
