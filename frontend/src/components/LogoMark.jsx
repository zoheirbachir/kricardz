/* DzKricar's icon mark: a car profile drawn as one continuous white stroke on
   the brand's orange disc.

   The geometry is the same one in scripts/generate-brand.cjs, which derives the
   favicon, app icon, splash screens and store graphics — keep them in sync.

   The mark is self-contained (it carries its own disc), so no background wrapper
   is needed. `rounded` is accepted for compatibility with existing call sites
   but is a no-op. */
export default function LogoMark({ className = 'w-9 h-9', rounded }) {  // eslint-disable-line no-unused-vars
  return (
    <svg viewBox="0 0 1024 1024" className={`${className} shrink-0`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DzKricar">
      <defs>
        {/* Unique per instance is unnecessary — the stops are identical everywhere. */}
        <linearGradient id="dzk-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF8C12" />
          <stop offset="0.55" stopColor="#FF5A0A" />
          <stop offset="1" stopColor="#FA3C00" />
        </linearGradient>
      </defs>
      <circle cx="512" cy="506" r="366" fill="url(#dzk-mark)" />
      <path
        d="M 452 576 L 216 576 C 300 470 390 388 486 374 C 578 360 634 424 676 472 C 700 500 736 486 780 500 C 818 514 832 550 826 592"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="46"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
