import type { AuthProfile, AuthResponse, AuthUser } from '../types/auth'

type AuthSessionResult =
  | { kind: 'missing-token' }
  | { kind: 'invalid-user' }
  | { kind: 'valid'; token: string; user: AuthProfile }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getUserCandidates(response: unknown): unknown[] {
  if (!isRecord(response)) {
    return []
  }

  const data = isRecord(response.data) ? response.data : null
  return [response.user, data?.user]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseAuthProfile(candidate: unknown): AuthProfile | null {
  if (
    !isRecord(candidate) ||
    !isNonEmptyString(candidate.name) ||
    !isNonEmptyString(candidate.email) ||
    !isNonEmptyString(candidate.role)
  ) {
    return null
  }

  const profile: AuthProfile = {
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
  }
  if (isNonEmptyString(candidate._id)) {
    profile._id = candidate._id.trim()
  }
  return profile
}

function parseVerifiedDecodedUser(candidate: unknown): AuthUser | null {
  if (
    !isRecord(candidate) ||
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.name) ||
    !isNonEmptyString(candidate.role)
  ) {
    return null
  }

  const user: AuthUser = {
    _id: candidate.id.trim(),
    name: candidate.name,
    role: candidate.role,
  }
  if (isNonEmptyString(candidate.email)) {
    user.email = candidate.email
  }
  return user
}

export function getAuthUser(response: AuthResponse): AuthProfile | null {
  for (const candidate of getUserCandidates(response)) {
    const user = parseAuthProfile(candidate)
    if (user) {
      return user
    }
  }
  return null
}

export function getVerifiedAuthUser(response: AuthResponse): AuthUser | null {
  if (isRecord(response)) {
    const decodedUser = parseVerifiedDecodedUser(response.decoded)
    if (decodedUser) {
      return decodedUser
    }
  }

  for (const candidate of getUserCandidates(response)) {
    const profile = parseAuthProfile(candidate)
    if (profile) {
      return profile
    }
    if (isRecord(candidate) && isNonEmptyString(candidate._id)) {
      return { _id: candidate._id.trim() }
    }
  }
  return null
}

export function parseAuthSession(response: AuthResponse): AuthSessionResult {
  if (!isRecord(response) || !isNonEmptyString(response.token)) {
    return { kind: 'missing-token' }
  }

  const user = getAuthUser(response)
  if (!user) {
    return { kind: 'invalid-user' }
  }

  return { kind: 'valid', token: response.token, user }
}
