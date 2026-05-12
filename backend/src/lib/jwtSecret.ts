let _secret: string | null = null;

export function getJwtSecret(): string {
  if (_secret) return _secret;
  _secret = process.env.JWT_SECRET || null;
  if (!_secret) {
    console.error("FATAL: JWT_SECRET environment variable is not set.");
    process.exit(1);
  }
  return _secret;
}
