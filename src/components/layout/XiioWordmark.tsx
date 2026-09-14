type Props = {
  className?: string;
};

export default function XiioWordmark({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 234 58"
      role="img"
      aria-label="OONA"
      className={`h-[25px] w-auto shrink-0 overflow-visible text-white ${className}`.trim()}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      >
        <circle cx="28" cy="29" r="19.5" />

        <path d="M68.55 26.8A19.5 19.5 0 0 1 107.45 26.8" />
        <path d="M107.45 31.2A19.5 19.5 0 0 1 68.55 31.2" />

        <path d="M130 48V10" />
        <path d="M130 10L145.66 27M149.34 31L165 48" />
        <path d="M165 10V48" />

        <path d="M204 10L196.84 27M195.16 31L188 48" />
        <path d="M207 10L225 48" />
      </g>
    </svg>
  );
}
