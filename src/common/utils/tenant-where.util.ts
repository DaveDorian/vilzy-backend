export const tenantWhere = (tenantId: string, extra = {}) => ({
  idTenant: tenantId,
  ...extra,
});
