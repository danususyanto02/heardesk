export function validInvitationEmail(email: string): boolean {
  if (email.length > 254 || /\s/.test(email)) {
    return false;
  }

  const separator = email.indexOf("@");
  if (separator < 1 || separator !== email.lastIndexOf("@")) {
    return false;
  }

  // The original policy accepts dots in either domain segment, including a
  // trailing dot when an earlier dot has nonempty text on both sides.
  const domain = email.slice(separator + 1);
  return domain.slice(1, -1).includes(".");
}
