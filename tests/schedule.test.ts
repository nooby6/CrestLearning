import assert from "node:assert";
import { zonedToUtc, occurrences, mondayOf, dateKey, slotsOverlap, partsInZone } from "../src/lib/schedule";
assert.equal(zonedToUtc(2026,10,27,"16:30").toISOString(), "2026-10-27T13:30:00.000Z");
assert.equal(zonedToUtc(2026,3,29,"02:30","Europe/Berlin").toISOString(), "2026-03-29T01:30:00.000Z"); // DST gap-ish
assert.equal(zonedToUtc(2026,7,1,"09:00","Europe/Berlin").toISOString(), "2026-07-01T07:00:00.000Z");
assert.equal(mondayOf("2026-10-27"), "2026-10-26");
assert.equal(mondayOf("2026-11-01"), "2026-10-26");
assert.equal(dateKey(new Date("2026-10-27T22:30:00Z")), "2026-10-28"); // late UTC = next day Nairobi
const occ = occurrences({weekday:"TUESDAY",startTime:"16:00",durationMinutes:60,timezone:"Africa/Nairobi",validFrom:new Date("2026-10-28"),validUntil:new Date("2026-11-17")},"2026-10-20","2026-12-31");
assert.deepEqual(occ.map(o=>o.startsAt.toISOString()),["2026-11-03T13:00:00.000Z","2026-11-10T13:00:00.000Z","2026-11-17T13:00:00.000Z"]);
assert.equal(occ[0].endsAt.toISOString(),"2026-11-03T14:00:00.000Z");
assert(slotsOverlap({weekday:"MONDAY",startTime:"16:00",durationMinutes:60},{weekday:"MONDAY",startTime:"16:30",durationMinutes:30}));
assert(!slotsOverlap({weekday:"MONDAY",startTime:"16:00",durationMinutes:60},{weekday:"MONDAY",startTime:"17:00",durationMinutes:30}));
assert.equal(partsInZone(new Date("2026-10-27T21:00:00Z")).iso, 3);
console.log("schedule tests passed");

// Classroom rules
import { joinState, isLate, untilLabel } from "../src/lib/classroom";
{
  const start = new Date("2026-10-27T13:00:00Z"), end = new Date("2026-10-27T14:00:00Z");
  const s = { startsAt: start, endsAt: end, status: "SCHEDULED" };
  const at = (iso: string) => new Date(iso).getTime();
  assert.equal(joinState(s, "student", at("2026-10-27T12:49:00Z")), "upcoming"); // 11 min early
  assert.equal(joinState(s, "student", at("2026-10-27T12:50:00Z")), "open"); // 10 min early
  assert.equal(joinState(s, "teacher", at("2026-10-27T12:45:00Z")), "open"); // teachers 15 min early
  assert.equal(joinState(s, "student", at("2026-10-27T14:30:00Z")), "open"); // overrun allowance
  assert.equal(joinState(s, "student", at("2026-10-27T14:31:00Z")), "closed");
  assert.equal(joinState({ ...s, status: "CANCELLED" }, "student", at("2026-10-27T13:05:00Z")), "closed");
  assert(!isLate(start, new Date("2026-10-27T13:10:00Z")));
  assert(isLate(start, new Date("2026-10-27T13:10:01Z")));
  assert.equal(untilLabel(new Date(at("2026-10-27T13:00:00Z")), at("2026-10-27T11:40:00Z")), "in 1 h 20 min");
  console.log("classroom tests passed");
}
