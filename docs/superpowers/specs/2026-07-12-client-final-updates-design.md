# KriCar — Client "Final Updates" batch (design)

Date: 2026-07-12
Source: client doc "KriCar التحديثات النهائية للمطور" (final developer updates).

Six new items on top of the already-shipped CRICAR 2.0 work. Nothing existing is
removed (client's explicit "restore/keep all previous features" point).

## A. Contract liability disclaimer
Fixed clause added to both contract types, rendered in `ContractView` after the
signature blocks and included in the stored contract `data`:

> "Après signature des deux parties, KriCar agit uniquement comme intermédiaire
> technique et décline toute responsabilité concernant l'exécution de la
> location, l'état du véhicule ou tout litige entre le loueur et le locataire."

No schema change.

## B. Mandatory car documents
`cars` new columns:
- `plate_image` TEXT — license-plate photo (public, shown on listing).
- `carte_grise_image` TEXT — gray card (private).
- `insurance_image` TEXT — insurance document (private).

Private docs are served through an auth-gated route (owner/admin only), stored
under `private_uploads/car_docs/`, mirroring the KYC pattern. `AddCar`/`EditCar`
get upload fields. The backend rejects create/publish (400) when any of: at least
one car photo, plate photo, carte grise, insurance is missing.

## C + D. Handover flow (owner records, on the booking)
`bookings` new columns:
- `checkin_video` TEXT, `checkin_km` INTEGER, `checkin_at` TEXT
- `checkout_video` TEXT, `checkout_km` INTEGER, `checkout_at` TEXT

Endpoints (owner of the car only; booking must be `confirmed`/`completed`):
- `POST /bookings/:id/checkin` — before delivery: video + start km.
- `POST /bookings/:id/checkout` — after return: video + end km.

Distance = `checkout_km - checkin_km` (computed, shown when both present). The
rental contract references the handover ("État à la livraison / au retour",
km at delivery/return, distance). Videos use the existing uploader (60MB/file).

## E. Availability with end date
`cars` new column `unavailable_until` TEXT (date). `AddCar`/`EditCar`: available
toggle + optional "indisponible jusqu'au [date]". `CarCard`/`CarDetail` show
"Indisponible jusqu'au …" when set and in the future. A car counts as available
only when `available = 1` AND (`unavailable_until` is null or in the past).

## F. Capture rules (frontend only)
In `Register.jsx` KYC uploads:
- Selfie input → `capture="user"` (camera only).
- Driving-license input → `accept="image/*"` with no capture attr (camera OR gallery).

## Reused infrastructure
- `lib/uploads.js` `makeUploader` factory.
- `config/paths.js` `UPLOADS_ROOT` (public) + `private_uploads` (sensitive).
- Idempotent `ALTER TABLE ... ADD COLUMN` migrations in `db/database.js`.

## Out of scope
- Smart AI-KYC verification (selfie ↔ ID ↔ register) — the client's own "future"
  phase; not in this batch.
