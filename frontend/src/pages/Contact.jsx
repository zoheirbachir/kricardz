import { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handle = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <p className="eyebrow justify-center mb-3">Support</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-3">Contactez-nous</h1>
        <p className="text-xl text-gray-500">Notre équipe est disponible 24h/24 et 7j/7.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact info */}
        <div className="space-y-4">
          {[
            { d: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', title: 'Téléphone', detail: '0673590224', sub: 'Disponible 24/7' },
            { d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', title: 'Email', detail: 'Kricar.services@gmail.com', sub: 'Réponse sous 2h' },
            { d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z', title: 'Adresse', detail: 'Alger, Algérie', sub: 'Siège principal' },
            { d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.84L3 20l1.34-3.5A7.7 7.7 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', title: 'Chat', detail: 'Via l\'application', sub: 'En temps réel' },
          ].map(c => (
            <div key={c.title} className="card p-4 flex items-start gap-3.5">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={c.d} /></svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
                <p className="text-sm text-gray-700">{c.detail}</p>
                <p className="text-xs text-gray-400">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="md:col-span-2">
          <div className="card p-6">
            {sent ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pine-50 text-pine-600 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="font-display font-semibold text-2xl text-gray-900 mb-2">Message envoyé !</h2>
                <p className="text-gray-500">Notre équipe vous répondra dans les plus brefs délais.</p>
                <button onClick={() => setSent(false)} className="btn-primary mt-4 text-sm">Envoyer un autre message</button>
              </div>
            ) : (
              <form onSubmit={handle} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                    <input className="input" required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" className="input" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sujet</label>
                  <select className="input" value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}>
                    <option value="">Choisir un sujet...</option>
                    <option>Problème avec une réservation</option>
                    <option>Question sur l'assurance</option>
                    <option>Signalement d'un utilisateur</option>
                    <option>Partenariat / Agence</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea className="input resize-none" rows={5} required
                    value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} />
                </div>
                <button type="submit" className="btn-primary w-full py-3">Envoyer le message</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
