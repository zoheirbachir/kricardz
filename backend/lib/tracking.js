const db = require('../db/database');

/* Who may see a specific car's live GPS: the car's owner, an admin, or a renter
   with a confirmed/completed booking for that car. Everyone else is denied. */
function canTrackCar(userId, carId) {
  if (!userId || !carId) return false;
  const car = db.prepare('SELECT owner_id FROM cars WHERE id = ?').get(carId);
  if (!car) return false;
  if (car.owner_id === userId) return true;
  const me = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId);
  if (me && me.is_admin === 1) return true;
  const booking = db.prepare(
    "SELECT 1 FROM bookings WHERE car_id = ? AND renter_id = ? AND status IN ('confirmed','completed')"
  ).get(carId, userId);
  return Boolean(booking);
}

module.exports = { canTrackCar };
