import QRCode from './QRCode';

/* Official electronic stamp (cachet électronique).
   `variant` controls the accent color: 'kricar' (primary) or 'agency' (pine).
   `lines` is an array of { label, value } rows printed inside the seal. */
export default function EStamp({ title, lines = [], qrValue, variant = 'kricar' }) {
  const accent = variant === 'agency'
    ? { ring: 'border-pine-600', text: 'text-pine-700', bg: 'bg-pine-50' }
    : { ring: 'border-primary-600', text: 'text-primary-700', bg: 'bg-primary-50' };

  return (
    <div className={`relative rounded-xl border-2 border-dashed ${accent.ring} ${accent.bg} p-4 w-full`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {qrValue ? <QRCode value={qrValue} size={84} /> : <div className="w-[84px] h-[84px] bg-white rounded" />}
          <p className="text-[9px] text-center text-gray-500 mt-1">Scan pour vérifier</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`inline-flex items-center gap-1 ${accent.text} font-bold text-sm uppercase tracking-wide mb-1.5`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {title}
          </div>
          <dl className="space-y-0.5">
            {lines.filter(l => l.value && l.value !== '—').map((l, i) => (
              <div key={i} className="flex gap-1.5 text-[11px] leading-tight">
                <dt className="text-gray-500 shrink-0">{l.label} :</dt>
                <dd className="text-gray-800 font-medium truncate">{l.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
