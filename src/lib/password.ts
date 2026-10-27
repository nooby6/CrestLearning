/** Readable temporary password: two words + 3 digits, e.g. "Summit-Maple-482". */
const WORDS = [
  "Summit", "Kilima", "Maple", "Cedar", "Savanna", "Acacia", "Falcon", "Harbor", "Meadow", "Lantern",
  "Comet", "Pebble", "Orbit", "Willow", "Baobab", "Jasmine", "Canyon", "Glacier", "Nimbus", "Zebra",
];

export function generatePassword() {
  const buf = new Uint32Array(3);
  crypto.getRandomValues(buf);
  const w1 = WORDS[buf[0] % WORDS.length];
  let w2 = WORDS[buf[1] % WORDS.length];
  if (w2 === w1) w2 = WORDS[(buf[1] + 7) % WORDS.length];
  return `${w1}-${w2}-${100 + (buf[2] % 900)}`;
}

export function suggestUsername(first: string, last: string) {
  const clean = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const f = clean(first);
  const l = clean(last);
  return [f, l].filter(Boolean).join(".");
}
