export class TokenEntity {
  constructor(
    public idRefreshToken: string,
    public token: string,
    public idUser: string,
    public revoked: boolean,
    public expiresAt: Date,
  ) {}
}
