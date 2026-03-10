export interface RequestUser {
  sub: string;
  tenantId: string;
  restaurantId?: string;
  email: string;
  role: string;
  deviceId: string;
}
