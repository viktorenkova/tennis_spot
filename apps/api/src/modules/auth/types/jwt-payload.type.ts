export type JwtPayload = {
  sub: string;
  phone: string;
  roles: string[];
  sid?: string;
};
