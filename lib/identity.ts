// Identity check for public re-enrollment (/api/enroll, /api/membership/enroll).
//
// Those endpoints are unauthenticated and their response carries the cardCode /
// memberCode — the credential staff redeem against. Matching on email alone would
// let anyone who knows a customer's address pull that customer's card, so the name
// has to line up too.
//
// Deliberately loose, because the cost of a false negative is a real casero locked
// out of their own card months later: accents, case and spacing are ignored, and a
// dropped surname still matches ("María Fernanda" ≈ "María Fernanda Rojas"). A lone
// first name does not match, since that is often guessable from the email itself.
// An empty stored name (scrubbed by account teardown) always passes rather than
// sealing the record shut.
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function nameMatches(typed: string, stored: string): boolean {
  const a = norm(typed);
  const b = norm(stored);
  if (!b || a === b) return true;
  const at = a.split(" ").filter(Boolean);
  const bt = b.split(" ").filter(Boolean);
  const prefix = (x: string[], y: string[]) => x.every((t, i) => y[i] === t);

  // They typed MORE than we stored ("María Rojas" vs a stored "María"): they already
  // know everything on file, so accept. The form only asks for "Nombre", so a
  // one-word stored name is common and must not seal the record shut.
  if (prefix(bt, at)) return true;

  // They typed LESS than we stored ("María Fernanda" vs "María Fernanda Rojas"):
  // accept, but require at least two tokens — a bare first name is often guessable
  // from the email address, which is the whole thing this check defends against.
  return at.length >= 2 && prefix(at, bt);
}
