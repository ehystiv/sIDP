export interface JwtPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
