import { SearchXIcon } from "lucide-react";

interface EventEmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EventEmptyState({ title, description, actionLabel, onAction }: EventEmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center gap-2.5 rounded-[22px] border-[1.5px] border-dashed border-input bg-card px-5 py-12 text-center lg:gap-3 lg:rounded-3xl lg:px-6 lg:py-[72px]">
      <span className="flex size-[52px] items-center justify-center rounded-2xl bg-accent text-primary lg:size-14 lg:rounded-[18px]">
        <SearchXIcon className="size-6" aria-hidden />
      </span>
      <span className="text-[17px] font-semibold lg:text-xl">{title}</span>
      <span className="max-w-[420px] text-sm leading-relaxed text-muted-foreground lg:text-[15px]">{description}</span>
      <button
        type="button"
        onClick={onAction}
        className="mt-1.5 h-12 rounded-[14px] bg-strong px-5 text-sm font-semibold text-white hover:bg-zinc-700 lg:mt-2 lg:px-[22px] lg:text-[15px]"
      >
        {actionLabel}
      </button>
    </div>
  );
}
