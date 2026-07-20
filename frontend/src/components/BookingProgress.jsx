/* Compact 3-step progress for a booking: Demandée → Confirmée → Terminée.
   Cancelled bookings show a single red state instead of the stepper. */
const STEPS = [
  { key: 'pending', label: 'Demandée' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'completed', label: 'Terminée' },
];

export default function BookingProgress({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        Annulée
      </div>
    );
  }

  const order = { pending: 0, confirmed: 1, completed: 2 };
  const current = order[status] ?? 0;

  return (
    <div className="flex items-center w-full max-w-[240px]" aria-label={`Statut : ${STEPS[current].label}`}>
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-transparent'}`}>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className={`mt-1 text-[9px] leading-tight text-center whitespace-nowrap ${done ? 'text-primary-600 dark:text-primary-300 font-medium' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded transition-colors ${i < current ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
