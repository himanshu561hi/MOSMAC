export const ROLES = {
  CUSTOMER: 'customer',
  SUPER_ADMIN: 'super_admin',
  STORE_MANAGER: 'store_manager',
  ORDER_MANAGER: 'order_manager',
  SUPPORT_STAFF: 'support_staff'
};

export const ALL_ROLES = Object.values(ROLES);

export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.STORE_MANAGER,
  ROLES.ORDER_MANAGER,
  ROLES.SUPPORT_STAFF
];

export default ROLES;

