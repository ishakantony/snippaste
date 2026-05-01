const PATHS: Record<string, string> = {
  sun: 'M12 3v1m0 16v1M4.22 4.22l.71.71m12.02 12.02.71.71M1 12h1m18 0h1M4.22 19.78l.71-.71M18.95 5.05l-.71.71M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  copy: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  scissors: 'M6 3l6 6m0 0l6-6M12 9v13M5.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  check: 'M20 6L9 17l-5-5',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  x: 'M18 6L6 18M6 6l12 12',
};

export interface IconProps {
  name: keyof typeof PATHS | string;
  size?: number;
  color?: string;
  className?: string;
}

export function Icon({ name, size = 16, color = "currentColor", className }: IconProps) {
  const d = PATHS[name as string] ?? "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
