import { DateTime } from 'luxon';
import { parseDateStringToLima, limaDateTimeToJSDate } from './src/lib/birthdays/service';

// Test the timezone logic for reservation dates and times
function testTimezoneLogic() {
  console.log('Testing timezone logic for birthday reservations...\n');

  // Simulate creating a reservation for October 31, 2025 at 8 PM
  const dateStr = '2025-10-31';
  const timeSlot = '20:00';

  console.log(`Input: date="${dateStr}", timeSlot="${timeSlot}"`);

  // This is what happens in the reservation creation endpoint
  const reservationDateTime = parseDateStringToLima(dateStr);
  const reservationDate = limaDateTimeToJSDate(reservationDateTime);

  console.log(`Parsed reservation date: ${reservationDate.toISOString()}`);
  console.log(`Reservation date in Lima: ${reservationDateTime.toISO()}`);

  // This is what happens when host arrives (in the POST endpoint)
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const hostArrivalDateTime = reservationDateTime.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  const hostArrivalTime = hostArrivalDateTime.toJSDate();

  console.log(`Host arrival time: ${hostArrivalTime.toISOString()}`);
  console.log(`Host arrival time in Lima: ${hostArrivalDateTime.toISO()}`);

  // This is what happens in recalculateTokenExpirations
  const newExpirationDateTime = hostArrivalDateTime.plus({ minutes: 45 });
  const newExpiration = newExpirationDateTime.toJSDate();

  console.log(`Token expiration: ${newExpiration.toISOString()}`);
  console.log(`Token expiration in Lima: ${newExpirationDateTime.toISO()}`);

  // Expected results
  console.log('\nExpected results:');
  console.log('- Host arrives at: 2025-10-31T20:00:00 in Lima (8:00 PM)');
  console.log('- Tokens expire at: 2025-10-31T20:45:00 in Lima (8:45 PM)');

  // Check if calculations are correct
  const expectedHostArrival = DateTime.fromISO('2025-10-31T20:00:00', { zone: 'America/Lima' });
  const expectedExpiration = DateTime.fromISO('2025-10-31T20:45:00', { zone: 'America/Lima' });

  console.log('\nValidation:');
  console.log(`Host arrival correct: ${hostArrivalDateTime.equals(expectedHostArrival)}`);
  console.log(`Expiration correct: ${newExpirationDateTime.equals(expectedExpiration)}`);

  if (!hostArrivalDateTime.equals(expectedHostArrival) || !newExpirationDateTime.equals(expectedExpiration)) {
    console.log('\n❌ TIMEZONE LOGIC IS BROKEN!');
  } else {
    console.log('\n✅ Timezone logic is correct!');
  }
}

testTimezoneLogic();