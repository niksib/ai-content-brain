/**
 * Strip sensitive query parameters (access tokens, client secrets) from any
 * string that might end up in logs. Threads, Meta, Google, etc. all tend to
 * echo the token back in error responses; never let those hit stdout.
 */
const SENSITIVE_PARAMS = [
  "access_token",
  "client_secret",
  "refresh_token",
  "id_token",
  "code",
];

export function redactSecrets(input: unknown): string {
  if (input === null || input === undefined) return String(input);
  const str = input instanceof Error ? `${input.name}: ${input.message}` : String(input);
  let out = str;
  for (const key of SENSITIVE_PARAMS) {
    // Matches `key=VALUE` in query strings, JSON-ish bodies, etc.
    const re = new RegExp(`(${key}["'=:]\\s*)[^\\s&"',}]+`, "gi");
    out = out.replace(re, `$1[REDACTED]`);
  }
  return out;
}
