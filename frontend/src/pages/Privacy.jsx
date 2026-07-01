import { Link } from 'react-router-dom';

const Section = ({ n, title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-3">
      <span className="text-primary-500">{n}.</span> {title}
    </h2>
    <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed text-[15px]">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <p className="eyebrow mb-1.5">Confidentialité</p>
      <h1 className="section-title mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : 1 juillet 2026</p>

      <Section n="1" title="Responsable du traitement">
        <p>KriCar (« la Plateforme ») est une plateforme algérienne de location de véhicules entre particuliers et agences. KriCar est responsable du traitement des données personnelles collectées via le site et l'application mobile.</p>
        <p>Contact : <a href="mailto:Kricar.services@gmail.com" className="text-primary-600 hover:underline">Kricar.services@gmail.com</a> — Tél. <a href="tel:0673590224" className="text-primary-600 hover:underline">0673590224</a> — Alger, Algérie.</p>
      </Section>

      <Section n="2" title="Données que nous collectons">
        <p>Selon votre utilisation, nous collectons :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Identité :</b> nom, prénom, adresse email, numéro de téléphone.</li>
          <li><b>Vérification (KYC) :</b> numéro d'identité nationale (NIN), numéro et dates de validité du permis de conduire, photos de vos documents et un selfie de vérification.</li>
          <li><b>Agences :</b> raison sociale, numéro de registre de commerce, adresse, informations du gérant.</li>
          <li><b>Utilisation :</b> annonces, réservations, contrats, avis et messages échangés.</li>
          <li><b>Localisation :</b> position GPS des véhicules équipés d'un traceur, uniquement pendant une location active.</li>
          <li><b>Techniques :</b> données de connexion et de sécurité (adresse IP, journaux d'authentification).</li>
        </ul>
      </Section>

      <Section n="3" title="Finalités">
        <p>Vos données servent à : créer et sécuriser votre compte ; vérifier votre identité ; vous mettre en relation avec des propriétaires ou locataires ; générer les contrats électroniques et leurs cachets ; assurer le suivi GPS pendant une location ; prévenir la fraude et garantir la sécurité de la Plateforme.</p>
      </Section>

      <Section n="4" title="Partage des données">
        <p>Pour permettre une location, certaines informations sont partagées entre le locataire et le propriétaire / l'agence (nom, coordonnées, numéro de permis) — notamment dans le contrat de location électronique. Nous ne vendons jamais vos données. Elles peuvent être communiquées aux autorités compétentes sur réquisition légale.</p>
      </Section>

      <Section n="5" title="Sécurité">
        <p>Les mots de passe sont stockés hachés (jamais en clair). Les liens de vérification et de réinitialisation sont temporaires et à usage unique. Les jetons de sécurité sont stockés sous forme chiffrée. Les opérations sensibles (vérification email, réinitialisation de mot de passe) sont enregistrées dans un journal d'audit.</p>
      </Section>

      <Section n="6" title="Conservation">
        <p>Nous conservons vos données tant que votre compte est actif, puis pendant la durée nécessaire au respect de nos obligations légales (notamment les contrats et pièces de vérification). Vous pouvez demander la suppression de votre compte à tout moment.</p>
      </Section>

      <Section n="7" title="Vos droits">
        <p>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données, ainsi que d'un droit d'opposition. Pour exercer ces droits, contactez-nous à <a href="mailto:Kricar.services@gmail.com" className="text-primary-600 hover:underline">Kricar.services@gmail.com</a>.</p>
      </Section>

      <Section n="8" title="Stockage local (cookies)">
        <p>La Plateforme utilise le stockage local de votre navigateur pour vous garder connecté (jeton d'authentification) et mémoriser vos préférences (langue, thème). Aucun cookie publicitaire tiers n'est utilisé.</p>
      </Section>

      <Section n="9" title="Modifications">
        <p>Cette politique peut être mise à jour. La date de dernière mise à jour figure en haut de page. Voir aussi nos <Link to="/terms" className="text-primary-600 hover:underline">Conditions générales d'utilisation</Link>.</p>
      </Section>
    </div>
  );
}
