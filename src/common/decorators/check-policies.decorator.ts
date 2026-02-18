import { SetMetadata } from '@nestjs/common';

export const CHECK_POLICIES_KEY = 'check_policy';

export type PolicyHandler = (user: any, request: any) => boolean;

export const CheckPolicies = (handler: PolicyHandler) =>
  SetMetadata(CHECK_POLICIES_KEY, handler);
