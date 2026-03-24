import type { ReactNode } from "react";

function IconBase({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function TargetIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3" />
      <path d="M12 18.5v3" />
      <path d="M2.5 12h3" />
      <path d="M18.5 12h3" />
    </IconBase>
  );
}

export function InboxIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </IconBase>
  );
}

export function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </IconBase>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m6.5 12.5 3.25 3.25 7.75-8.25" />
    </IconBase>
  );
}

export function LayersIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m12 4 8 4.5-8 4.5-8-4.5L12 4Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 15.5 8 4.5 8-4.5" />
    </IconBase>
  );
}

export function BookOpenIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h11.5v16H7a2.5 2.5 0 0 0-2.5 2.5Z" />
      <path d="M7 3v18" />
      <path d="M18.5 5.5h-9" />
    </IconBase>
  );
}

export function BurgerIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 7.5h14" />
      <path d="M5 12h14" />
      <path d="M5 16.5h14" />
    </IconBase>
  );
}

export function CollapseSidebarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3.5" y="4" width="17" height="16" rx="3" />
      <path d="M9 4v16" />
    </IconBase>
  );
}

export function SettingsIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v1.75" />
      <path d="M12 17.75v1.75" />
      <path d="m6.7 6.7 1.25 1.25" />
      <path d="m16.05 16.05 1.25 1.25" />
      <path d="M4.5 12h1.75" />
      <path d="M17.75 12h1.75" />
      <path d="m6.7 17.3 1.25-1.25" />
      <path d="m16.05 7.95 1.25-1.25" />
    </IconBase>
  );
}

export function FolderIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2.5h5.5A2.5 2.5 0 0 1 20 10v6.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M4 9.5h16" />
    </IconBase>
  );
}

export function UserIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 18.5a6.5 6.5 0 0 1 13 0" />
    </IconBase>
  );
}

export function ArrowTurnIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 7h10" />
      <path d="m7 7 3-3" />
      <path d="m7 7 3 3" />
      <path d="M17 7v5a5 5 0 0 1-5 5H6" />
    </IconBase>
  );
}

export function SparkIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 4.5 13.8 9l4.7 1.8-4.7 1.8L12 17l-1.8-4.4-4.7-1.8L10.2 9 12 4.5Z" />
      <path d="M18.5 4.5v3" />
      <path d="M17 6h3" />
    </IconBase>
  );
}

export function PaletteIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 4.5a7.5 7.5 0 1 0 0 15h1.25a1.75 1.75 0 0 0 0-3.5H12a1.75 1.75 0 0 1 0-3.5h2.25A3.75 3.75 0 0 0 18 8.75 4.25 4.25 0 0 0 13.75 4.5Z" />
      <circle cx="7.75" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.75" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="8.25" r="0.9" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function NoteIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 3.5h7l4 4V20.5H7a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5v4h4" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h7" />
    </IconBase>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </IconBase>
  );
}

export function ColumnsIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M8.5 4.5v15" />
      <path d="M15.5 4.5v15" />
    </IconBase>
  );
}

export function FocusModeIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M8 4.5H4.5V8" />
      <path d="M16 4.5h3.5V8" />
      <path d="M8 19.5H4.5V16" />
      <path d="M16 19.5h3.5V16" />
      <path d="M9 9 4.5 4.5" />
      <path d="m15 9 4.5-4.5" />
      <path d="m9 15-4.5 4.5" />
      <path d="m15 15 4.5 4.5" />
    </IconBase>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5.5 7h13" />
      <path d="M9 4.5h6" />
      <path d="M8 7l.6 11a1.5 1.5 0 0 0 1.5 1.4h3.8a1.5 1.5 0 0 0 1.5-1.4L16 7" />
      <path d="M10.5 10.5v5.5" />
      <path d="M13.5 10.5v5.5" />
    </IconBase>
  );
}

export function EditIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m14.5 5.5 4 4" />
      <path d="M6 18.5h4l9-9a1.4 1.4 0 0 0 0-2l-2.5-2.5a1.4 1.4 0 0 0-2 0l-9 9v4.5Z" />
      <path d="M13 7l4 4" />
    </IconBase>
  );
}

export function InfoIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </IconBase>
  );
}

export function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

export function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}
