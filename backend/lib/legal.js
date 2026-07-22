const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

/* ── Baseline terms (version 1.0) ────────────────────────────────────────────
   Covers the sections the platform must publish: general terms, lessor terms,
   renter terms, cancellation/refund, liability limits, privacy and cookies.
   An admin can publish a new version at any time from the admin panel. */
const SEED_FR = `# Conditions Générales d'Utilisation — DzKricar

## 1. Objet
DzKricar est une plateforme algérienne de mise en relation pour la location de véhicules entre particuliers et agences. En créant un compte ou en réservant, vous acceptez les présentes conditions.

## 2. Rôle de la plateforme
DzKricar est un intermédiaire technique. DzKricar n'est pas partie au contrat de location conclu entre le locataire et le loueur, ne loue aucun véhicule en son nom propre, et n'est pas propriétaire des véhicules proposés.

## 3. Obligations du loueur (agence / propriétaire)
- Fournir un véhicule conforme, assuré et en état de circuler.
- Fournir des documents valides : carte grise, assurance, plaque d'immatriculation.
- Documenter l'état du véhicule (photos/vidéo et kilométrage) à la livraison et au retour.
- Respecter les dates et le prix annoncés.

## 4. Obligations du locataire
- Détenir un permis de conduire valide et fournir une pièce d'identité authentique.
- Utiliser le véhicule en bon père de famille et respecter le code de la route.
- Restituer le véhicule à la date convenue, dans l'état de la livraison.
- Assumer les amendes, infractions et dommages survenus pendant la location.

## 5. Annulation et remboursement
- Toute annulation doit être effectuée via la plateforme.
- Les conditions d'annulation et de caution sont celles annoncées par le loueur sur l'annonce.
- Les litiges de remboursement se règlent entre les parties ; DzKricar peut fournir les preuves enregistrées (contrat, consentements, photos/vidéos).

## 6. Contrat électronique
Chaque location génère un contrat électronique horodaté, scellé par les cachets électroniques et un code QR de vérification. Le contrat mentionne la version des conditions acceptée par les parties.

## 7. Limites de responsabilité
DzKricar ne saurait être tenue responsable des dommages, litiges, retards ou manquements liés à l'exécution du contrat de location entre les parties. La plateforme met en œuvre des moyens raisonnables (vérification d'identité, contrats, cachets, historique) sans garantie de résultat.

## 8. Données personnelles
Les données sont traitées conformément à la Politique de confidentialité. Les documents d'identité sont conservés de manière privée et ne sont accessibles qu'à l'administration et, pour une location en cours, à l'agence concernée.

## 9. Cookies
La plateforme utilise des cookies strictement nécessaires au fonctionnement (session, langue, préférences). Aucun cookie publicitaire tiers n'est déposé.

## 10. Droit applicable
Les présentes conditions sont régies par le droit algérien. Tout litige relève des juridictions algériennes.`;

const SEED_AR = `# الشروط والأحكام — DzKricar

## 1. الغرض
DzKricar منصة جزائرية للوساطة في تأجير السيارات بين الأفراد والوكالات. بإنشاء حساب أو بإجراء حجز، فإنك توافق على هذه الشروط.

## 2. دور المنصة
DzKricar وسيط تقني فقط. المنصة ليست طرفًا في عقد الكراء المبرم بين المستأجر والمؤجر، ولا تؤجر أي مركبة باسمها، ولا تملك المركبات المعروضة.

## 3. التزامات المؤجر (الوكالة / المالك)
- تقديم مركبة مطابقة ومؤمَّنة وصالحة للسير.
- تقديم وثائق سارية: البطاقة الرمادية، وثيقة التأمين، ولوحة الترقيم.
- توثيق حالة المركبة (صور/فيديو والعداد) عند التسليم وعند الاسترجاع.
- احترام التواريخ والسعر المعلن.

## 4. التزامات المستأجر
- حيازة رخصة سياقة سارية وتقديم وثيقة هوية صحيحة.
- استعمال المركبة بعناية واحترام قانون المرور.
- إرجاع المركبة في التاريخ المتفق عليه وبنفس الحالة.
- تحمّل المخالفات والأضرار التي تقع أثناء مدة الكراء.

## 5. الإلغاء والاسترجاع
- يتم كل إلغاء عبر المنصة.
- شروط الإلغاء والضمان (الكوسيون) هي المعلنة من طرف المؤجر في الإعلان.
- تُسوّى نزاعات الاسترجاع بين الطرفين، ويمكن للمنصة تقديم الأدلة المسجّلة (العقد، الموافقات، الصور والفيديو).

## 6. العقد الإلكتروني
يُنشأ لكل عملية كراء عقد إلكتروني مؤرَّخ، مختوم بالأختام الإلكترونية ورمز QR للتحقق. ويذكر العقد نسخة الشروط التي وافق عليها الطرفان.

## 7. حدود المسؤولية
لا تتحمل DzKricar المسؤولية عن الأضرار أو النزاعات أو التأخير أو الإخلالات المرتبطة بتنفيذ عقد الكراء بين الطرفين. تبذل المنصة وسائل معقولة (التحقق من الهوية، العقود، الأختام، السجلات) دون ضمان نتيجة.

## 8. المعطيات الشخصية
تُعالَج المعطيات وفق سياسة الخصوصية. تُحفظ وثائق الهوية بشكل خاص ولا يطّلع عليها إلا الإدارة، وكذلك الوكالة المعنية في حال وجود حجز جارٍ.

## 9. ملفات تعريف الارتباط (Cookies)
تستعمل المنصة ملفات ضرورية للتشغيل فقط (الجلسة، اللغة، التفضيلات)، دون أي ملفات إشهارية لطرف ثالث.

## 10. القانون المطبق
تخضع هذه الشروط للقانون الجزائري، وتختص المحاكم الجزائرية بالنظر في أي نزاع.`;

const SEED_EN = `# Terms and Conditions — DzKricar

## 1. Purpose
DzKricar is an Algerian platform connecting people and agencies for vehicle rental. By creating an account or making a booking, you accept these terms.

## 2. Role of the platform
DzKricar is a technical intermediary. DzKricar is not a party to the rental agreement between renter and lessor, does not rent vehicles in its own name, and does not own the listed vehicles.

## 3. Lessor obligations (agency / owner)
- Provide a compliant, insured and roadworthy vehicle.
- Provide valid documents: registration card, insurance, licence plate.
- Document the vehicle's condition (photos/video and odometer) at delivery and return.
- Honour the advertised dates and price.

## 4. Renter obligations
- Hold a valid driving licence and provide genuine identity documents.
- Use the vehicle responsibly and comply with traffic law.
- Return the vehicle on the agreed date in the condition received.
- Bear fines, offences and damage occurring during the rental.

## 5. Cancellation and refunds
- Cancellations must be made through the platform.
- Cancellation and deposit conditions are those published by the lessor on the listing.
- Refund disputes are settled between the parties; DzKricar can supply the recorded evidence (contract, consents, photos/videos).

## 6. Electronic contract
Each rental generates a timestamped electronic contract, sealed with electronic stamps and a QR verification code. The contract states the terms version accepted by the parties.

## 7. Limitation of liability
DzKricar cannot be held liable for damage, disputes, delays or breaches relating to performance of the rental agreement between the parties. The platform applies reasonable measures (identity verification, contracts, stamps, audit records) without guarantee of outcome.

## 8. Personal data
Data is processed under the Privacy Policy. Identity documents are stored privately and are accessible only to administration and, for an active rental, to the agency concerned.

## 9. Cookies
The platform uses strictly necessary cookies only (session, language, preferences). No third-party advertising cookies are set.

## 10. Governing law
These terms are governed by Algerian law. Any dispute falls under the jurisdiction of Algerian courts.`;

/* The version currently in force (most recently published). */
function currentTerms() {
  return db.prepare(
    'SELECT * FROM terms_versions WHERE published = 1 ORDER BY published_at DESC, created_at DESC LIMIT 1'
  ).get() || null;
}

/* Publish the baseline once so the platform always has terms in force. */
function ensureSeeded() {
  try {
    const any = db.prepare('SELECT COUNT(*) AS n FROM terms_versions').get().n;
    if (any > 0) return;
    db.prepare(`INSERT INTO terms_versions (id, version, content_fr, content_ar, content_en, published, published_at)
      VALUES (?, '1.0', ?, ?, ?, 1, datetime('now'))`).run(uuidv4(), SEED_FR, SEED_AR, SEED_EN);
    console.log('Seeded terms & conditions version 1.0');
  } catch (e) {
    console.error('terms seed failed:', e.message);
  }
}

/* Record an acceptance with the evidence needed in a dispute. Returns the row. */
function recordConsent(req, userId, { context, booking_id = null, version = null } = {}) {
  try {
    const v = version || currentTerms()?.version;
    if (!userId || !v) return null;
    const id = uuidv4();
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').toString().slice(0, 64) || null;
    const ua = (req.headers['user-agent'] || '').toString().slice(0, 400) || null;
    const lang = (req.body?.lang || req.headers['accept-language'] || '').toString().slice(0, 16) || null;
    db.prepare(`INSERT INTO consents (id, user_id, terms_version, context, booking_id, ip, user_agent, lang)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, v, context, booking_id, ip, ua, lang);
    db.prepare("UPDATE users SET terms_version = ?, terms_accepted_at = datetime('now') WHERE id = ?").run(v, userId);
    return db.prepare('SELECT * FROM consents WHERE id = ?').get(id);
  } catch (e) {
    console.error('recordConsent failed:', e.message);
    return null;
  }
}

module.exports = { currentTerms, ensureSeeded, recordConsent };
