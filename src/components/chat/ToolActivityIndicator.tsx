type Props = {
  activity: string;
};

export default function ToolActivityIndicator({ activity }: Props) {
  return (
    <div role="status" aria-live="polite" aria-label={activity} className="flex items-center gap-2 animate-slide-up">
      <div className="flex items-center gap-2 rounded-full border border-[rgba(41,151,255,0.18)] bg-[rgba(255,255,255,0.82)] px-3.5 py-1.5 shadow-[0_12px_24px_rgba(41,151,255,0.08)]">
        <span className="relative flex h-2 w-2">
          <span aria-hidden="true" className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand)] opacity-35" />
          <span aria-hidden="true" className="relative inline-flex h-2 w-2 rounded-full bg-[rgba(41,151,255,0.6)]" />
        </span>
        <span className="text-[12px] text-slate-500">{activity}</span>
      </div>
    </div>
  );
}
