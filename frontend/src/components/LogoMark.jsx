/* DzKricar's icon mark: a "K" monogram whose diagonal strokes double as a car
   silhouette (roofline + hood) sitting on two wheel dots. Pure geometry on a
   40x40 grid so it stays crisp from favicon size up to app-icon size. */
export default function LogoMark({ className = 'w-9 h-9', rounded = 'rounded-xl' }) {
  return (
    <div className={`${className} ${rounded} bg-primary-500 flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 40 40" className="w-[65%] h-[65%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="13" y="9" width="4.5" height="23" rx="1.2" fill="white" />
        <polygon points="17.5,20 17.5,15.5 30,9 24.5,9" fill="white" />
        <polygon points="17.5,21.5 17.5,26.5 30,32 24.5,32" fill="white" />
        <circle cx="15" cy="32.5" r="2.2" fill="white" />
        <circle cx="27" cy="32.5" r="2.2" fill="white" />
      </svg>
    </div>
  );
}
