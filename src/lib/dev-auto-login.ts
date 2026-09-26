/**
 * Email to sign in as automatically, or null when auto sign-in is off.
 * Never active in production builds, whatever the env says: a deployed site
 * with auto sign-in would hand the household's data to anyone.
 */
export function devAutoLoginEmail(): string | null {
  if (process.env.NODE_ENV === 'production') return null
  return process.env.DEV_AUTO_LOGIN_EMAIL?.trim() || null
}
