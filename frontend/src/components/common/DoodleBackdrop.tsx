/**
 * Hand-drawn "doodle" backdrop for the login screens.
 * Renders a full-bleed SVG of sketchy steel-industry + hiring motifs with
 * orange accents. Sits behind the page content (pointer-events: none) and
 * scales with the viewport via a fixed viewBox.
 */

const INK = '#334155';
const ORANGE = '#FF6B00';

type DoodleProps = {
  className?: string;
};

export function DoodleBackdrop({ className }: DoodleProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      >
        {/* ---- Steel coil (top-left) ---- */}
        <g transform="translate(70 70)">
          <ellipse cx="70" cy="55" rx="70" ry="52" />
          <ellipse cx="70" cy="55" rx="26" ry="19" />
          <path d="M70 3v0M12 34l18 8M12 76l18-8M70 107v0M128 34l-18 8M128 76l-18-8" opacity={0.5} />
          <path d="M70 36a19 14 0 1 0 0.1 0" opacity={0.5} />
          <path d="M70 21a34 26 0 1 0 0.1 0" opacity={0.4} />
        </g>

        {/* ---- Stacked pipes (left) ---- */}
        <g transform="translate(30 250)">
          <circle cx="26" cy="60" r="22" />
          <circle cx="72" cy="60" r="22" />
          <circle cx="118" cy="60" r="22" />
          <circle cx="49" cy="22" r="22" />
          <circle cx="95" cy="22" r="22" />
          <circle cx="72" cy="-14" r="22" />
          <circle cx="26" cy="60" r="9" opacity={0.5} />
          <circle cx="72" cy="60" r="9" opacity={0.5} />
          <circle cx="118" cy="60" r="9" opacity={0.5} />
          <circle cx="49" cy="22" r="9" opacity={0.5} />
          <circle cx="95" cy="22" r="9" opacity={0.5} />
          <circle cx="72" cy="-14" r="9" opacity={0.5} />
        </g>

        {/* ---- I-beam (left-lower) ---- */}
        <g transform="translate(40 470)">
          <path d="M4 6h120l-30 22H34z" />
          <path d="M64 28l0 44" />
          <path d="M34 72h60l30 22H4z" />
        </g>

        {/* ---- Rebar bundle (bottom-left) ---- */}
        <g transform="translate(20 560)" opacity={0.7}>
          <path d="M0 40l150-24M2 52l150-24M4 64l150-24" />
          <circle cx="150" cy="16" r="6" />
          <circle cx="152" cy="28" r="6" />
          <circle cx="154" cy="40" r="6" />
        </g>

        {/* ---- Crane hoisting a coil (top-center) ---- */}
        <g transform="translate(600 20)">
          <path d="M0 30h300M20 30l260 0" opacity={0.5} />
          <path d="M0 22h300v16H0z" />
          <path d="M150 38v34" />
          <path d="M150 72l-24 34h48z" />
          <ellipse cx="150" cy="132" rx="42" ry="30" />
          <ellipse cx="150" cy="132" rx="15" ry="10" />
        </g>

        {/* ---- Clipboard with candidate (top) ---- */}
        <g transform="translate(360 70)">
          <rect x="0" y="10" width="80" height="104" rx="8" />
          <rect x="26" y="0" width="28" height="18" rx="5" />
          <circle cx="40" cy="42" r="12" />
          <path d="M24 70c4-12 28-12 32 0" />
          <path d="M20 88h40M20 100h28" opacity={0.6} />
          <path d="M12 40l6 6 10-12" stroke={ORANGE} />
        </g>

        {/* ---- Magnifier over person (top) ---- */}
        <g transform="translate(520 70)">
          <circle cx="34" cy="34" r="30" />
          <circle cx="34" cy="26" r="8" />
          <path d="M22 46c3-9 21-9 24 0" />
          <path d="M56 56l22 22" strokeWidth={3} />
        </g>

        {/* ---- Group of people (top) ---- */}
        <g transform="translate(495 150)" stroke={INK}>
          <circle cx="20" cy="14" r="9" />
          <path d="M6 44c0-14 28-14 28 0" />
          <circle cx="52" cy="10" r="10" fill={ORANGE} stroke={ORANGE} />
          <path d="M36 44c0-16 32-16 32 0" />
          <circle cx="84" cy="14" r="9" />
          <path d="M70 44c0-14 28-14 28 0" />
        </g>

        {/* ---- Megaphone (top-right) ---- */}
        <g transform="translate(1300 60)">
          <path d="M6 26l64-22v56L6 42z" />
          <path d="M6 26H-8v16H6z" />
          <path d="M20 52l6 22h12l-6-24" />
          <path d="M80 8l16-8M84 30h20M80 52l16 8" stroke={ORANGE} />
          <path d="M70 4l0 56" fill={ORANGE} stroke={ORANGE} opacity={0.25} />
        </g>

        {/* ---- People trio (right) ---- */}
        <g transform="translate(1300 220)">
          <circle cx="18" cy="14" r="10" />
          <path d="M2 46c0-16 32-16 32 0" />
          <circle cx="52" cy="10" r="11" fill={ORANGE} stroke={ORANGE} />
          <path d="M34 48c0-18 36-18 36 0" />
          <circle cx="86" cy="14" r="10" />
          <path d="M70 46c0-16 32-16 32 0" />
        </g>

        {/* ---- Resume / document with check (right) ---- */}
        <g transform="translate(1290 360)">
          <rect x="0" y="0" width="92" height="110" rx="8" />
          <circle cx="24" cy="26" r="10" />
          <path d="M42 20h34M42 32h28" opacity={0.6} />
          <path d="M14 56h64M14 70h64M14 84h44" opacity={0.6} />
          <circle cx="78" cy="96" r="16" fill={ORANGE} stroke={ORANGE} />
          <path d="M70 96l6 6 10-12" stroke="#fff" strokeWidth={2.5} />
        </g>

        {/* ---- Growth chart (right-lower) ---- */}
        <g transform="translate(1300 560)">
          <path d="M0 90V0M0 90h96" />
          <rect x="12" y="60" width="14" height="30" fill={ORANGE} stroke={ORANGE} opacity={0.5} />
          <rect x="34" y="44" width="14" height="46" />
          <rect x="56" y="26" width="14" height="64" fill={ORANGE} stroke={ORANGE} opacity={0.5} />
          <path d="M6 70l24-16 22 8 30-40" stroke={ORANGE} />
          <path d="M74 22h12v12" stroke={ORANGE} />
        </g>

        {/* ---- Magnifier + person (right) ---- */}
        <g transform="translate(1140 660)">
          <circle cx="30" cy="30" r="28" />
          <circle cx="30" cy="23" r="7" />
          <path d="M19 42c3-8 19-8 22 0" />
          <path d="M50 50l20 20" strokeWidth={3} />
        </g>

        {/* ---- HR at desk (bottom-left) ---- */}
        <g transform="translate(70 690)">
          <path d="M40 40a20 20 0 1 1 40 0" />
          <circle cx="60" cy="24" r="16" fill={ORANGE} stroke={ORANGE} opacity={0.9} />
          <path d="M30 120c0-40 60-40 60 0" fill={ORANGE} stroke={ORANGE} opacity={0.85} />
          <rect x="120" y="20" width="150" height="100" rx="8" />
          <path d="M140 44h40M140 60h30M140 78h44" opacity={0.6} />
          <path d="M196 40l6 6 10-12" stroke={ORANGE} />
          <path d="M196 60l6 6 10-12" stroke={ORANGE} />
          <path d="M196 80l6 6 10-12" stroke={ORANGE} />
          <path d="M120 120h150M180 120v20M160 150h40" />
        </g>

        {/* ---- Handshake (bottom-center-left) ---- */}
        <g transform="translate(470 770)">
          <path d="M0 20l30-8 20 10 20-10 30 8" />
          <path d="M28 22c10 6 24 6 34 0" fill={ORANGE} stroke={ORANGE} opacity={0.5} />
          <path d="M30 26l16 12M50 24l14 12" />
        </g>

        {/* ---- Target with arrow (bottom-center) ---- */}
        <g transform="translate(650 760)">
          <circle cx="40" cy="40" r="38" />
          <circle cx="40" cy="40" r="24" />
          <circle cx="40" cy="40" r="10" fill={ORANGE} stroke={ORANGE} />
          <path d="M40 40l40-40M64 0h16v16" stroke={ORANGE} />
        </g>

        {/* ---- Hard hat + gears (bottom-center) ---- */}
        <g transform="translate(800 820)">
          <path d="M4 40a44 44 0 0 1 88 0z" fill={ORANGE} stroke={ORANGE} opacity={0.85} />
          <path d="M-6 40h108" />
          <path d="M40 6v14M56 6v14" />
          <g transform="translate(104 8)" opacity={0.8}>
            <circle cx="14" cy="14" r="8" />
            <path d="M14 2v-4M14 30v-4M2 14h-4M30 14h-4M5 5l-3-3M23 23l3 3M23 5l3-3M5 23l-3 3" />
          </g>
        </g>

        {/* ---- Laptop (bottom-center-right) ---- */}
        <g transform="translate(1030 830)">
          <rect x="10" y="0" width="90" height="56" rx="5" />
          <path d="M0 68h110l-8-12H8z" />
          <path d="M28 18h54M28 30h40" opacity={0.6} />
        </g>

        {/* ---- Office chair (bottom-right) ---- */}
        <g transform="translate(1330 760)">
          <path d="M20 10h40a8 8 0 0 1 8 8v46H12V18a8 8 0 0 1 8-8z" fill={ORANGE} stroke={ORANGE} opacity={0.85} />
          <path d="M40 64v22M18 100h44M40 86l-22 14M40 86l22 14" />
          <path d="M8 40h6v24M72 40h-6v24" />
        </g>

        {/* ---- Potted plants ---- */}
        <g transform="translate(360 840)">
          <path d="M12 30h20l-3 22H15z" />
          <path d="M22 30c-8-12-16-8-16 0M22 30c8-12 16-8 16 0M22 30c0-14 0-18 0-22" />
        </g>
        <g transform="translate(1200 830)">
          <path d="M12 30h20l-3 22H15z" />
          <path d="M22 30c-8-12-16-8-16 0M22 30c8-12 16-8 16 0M22 30c0-14 0-18 0-22" />
        </g>

        {/* ---- Faint factory skyline (center-behind) ---- */}
        <g transform="translate(360 560)" opacity={0.28}>
          <path d="M0 120h520" />
          <path d="M40 120V70h30v50M70 84h26v36M120 120V54h34v66" />
          <path d="M180 120V40c0-8 10-8 10 0v80M200 120V64h30v56" />
          <path d="M260 120V72h40v48M312 120V50h26v70" />
          <path d="M360 120V80h34v40M404 120V60h30v60" />
          <path d="M50 70c0-10-14-10-14 0M126 54c0-10-14-10-14 0M270 72c0-10-14-10-14 0" />
        </g>

        {/* ---- Dotted connector paths ---- */}
        <path
          d="M250 160C330 210 300 300 240 340"
          strokeDasharray="2 12"
          strokeWidth={3}
          opacity={0.5}
        />
        <path
          d="M640 220C740 260 700 360 800 380"
          strokeDasharray="2 12"
          strokeWidth={3}
          opacity={0.4}
        />
        <path
          d="M1180 140C1090 180 1130 260 1210 300"
          strokeDasharray="2 12"
          strokeWidth={3}
          opacity={0.45}
        />
        <path
          d="M560 720C620 760 700 700 660 640"
          strokeDasharray="2 12"
          strokeWidth={3}
          opacity={0.4}
        />

        {/* ---- Little sparkles / marks ---- */}
        <g stroke={ORANGE} opacity={0.7}>
          <path d="M300 60l0 12M294 66h12" />
          <path d="M1120 120l0 10M1115 125h10" />
          <path d="M780 460l0 10M775 465h10" />
          <path d="M40 700l8 8M48 700l-8 8" />
        </g>
        <g opacity={0.5}>
          <circle cx="340" cy="360" r="4" />
          <circle cx="1080" cy="620" r="4" />
          <circle cx="900" cy="120" r="4" />
          <circle cx="150" cy="180" r="4" />
        </g>
      </g>
    </svg>
  );
}

export default DoodleBackdrop;
