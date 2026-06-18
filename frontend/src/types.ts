export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  roles: Role[];
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
