/* DzKricar's icon mark: the brand's orange disc with the white car-profile
   curve. Geometry is copied verbatim from the brand package
   (DzKricar-Brand/Favicon/favicon.svg) so it matches the supplied assets exactly.

   The mark is self-contained — it carries its own circular shape — so no
   background wrapper is needed. `rounded` is still accepted for compatibility
   with existing call sites but is a no-op. */
export default function LogoMark({ className = 'w-9 h-9', rounded }) {  // eslint-disable-line no-unused-vars
  return (
    <svg viewBox="0 0 256 256" className={`${className} shrink-0`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DzKricar">
      <circle cx="128" cy="128" r="94" fill="#FF5A0A" />
      <path
        d="M 22 66 C 30 48 45 37 61 37 C 73 37 83 42 94 53 C 98 57 103 59 111 59 C 126 59 136 66 139 77"
        transform="translate(47 56) scale(1.15)"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
