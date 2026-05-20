type Props = {
  activity: string;
};

export default function ToolActivityIndicator({ activity }: Props) {
  return (
    <div role="status" aria-live="polite" aria-label={activity} className="flex items-center gap-2 animate-slide-up">
      <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#FAC515]/[0.12] rounded-full px-3.5 py-1.5">
        <span className="relative flex h-2 w-2">
          <span aria-hidden="true" className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FAC515] opacity-35" />
          <span aria-hidden="true" className="relative inline-flex rounded-full h-2 w-2 bg-[#FAC515]/55" />
        </span>
        <span className="text-[12px] text-[#aaa]">{activity}</span>
      </div>
    </div>
  );
}
