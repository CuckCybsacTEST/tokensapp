const { mapAreaToStaffRole, getStaffPermissions } = require('./src/lib/staff-roles.ts');

console.log('Testing staff roles for all areas:');

// Test different areas
const areas = ['Caja', 'Barra', 'Mozos', 'Seguridad', 'Animación', 'DJs', 'Multimedia', 'Otros', null];

areas.forEach(area => {
  const role = mapAreaToStaffRole(area);
  const permissions = getStaffPermissions(role);
  console.log(`${area || 'null'}: Role=${role}, CanViewOrders=${permissions.canViewOrders}, CanViewMetrics=${permissions.canViewMetrics}`);
});