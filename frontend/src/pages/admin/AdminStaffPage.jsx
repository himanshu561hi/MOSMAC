import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  UserCheck,
  Plus,
  Shield,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Lock,
  Mail,
  Phone,
  User
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { formatDate } from '@/utils/formatters';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Full administrative privileges, staff management, audit log access' },
  { value: 'store_manager', label: 'Store Manager', desc: 'Catalogue, products, pricing, inventory adjustments, coupons' },
  { value: 'order_manager', label: 'Order Manager', desc: 'Orders processing, tracking updates, fulfilment, refund dispatch' },
  { value: 'support_staff', label: 'Support Staff', desc: 'Customer lookup, order status inspection, customer staff notes' }
];

export function AdminStaffPage() {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState(null);

  // Create Staff Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'store_manager'
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Update Role Modal
  const [roleTargetStaff, setRoleTargetStaff] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getStaff({
        search: search.trim() || undefined,
        role: roleFilter || undefined
      });
      setStaff(res.staff || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [roleFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      await adminService.createStaff(createData);
      setShowCreateModal(false);
      setCreateData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'store_manager'
      });
      loadStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create staff member');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleTargetStaff || !newRole) return;
    try {
      setRoleLoading(true);
      await adminService.updateStaffRole(roleTargetStaff._id, { role: newRole });
      setRoleTargetStaff(null);
      loadStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update staff role');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRevokeSessions = async (staffMember) => {
    if (!window.confirm(`Revoke all active sessions for ${staffMember.email}? They will be forced to log in again.`)) return;
    try {
      await adminService.revokeStaffSessions(staffMember._id);
      alert(`Active sessions for ${staffMember.email} successfully revoked.`);
      loadStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke staff sessions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            Staff Accounts & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage administrative personnel, enforce least-privilege roles, and revoke active sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BulkActionButtons
            module="staff"
            moduleTitle="Staff"
            supportsImport={false}
            supportsExport={true}
          />
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* Role Descriptions Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {ROLE_OPTIONS.map((r) => (
          <div key={r.value} className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs shadow-sm">
            <span className="font-bold text-gray-900 block">{r.label}</span>
            <p className="text-gray-500 text-[11px] mt-1 leading-snug">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadStaff()}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-gray-500 whitespace-nowrap">Filter Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-emerald-500"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="store_manager">Store Manager</option>
            <option value="order_manager">Order Manager</option>
            <option value="support_staff">Support Staff</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-gray-200">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Email & Contact</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Token Version</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    Loading staff records...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                staff.map((s) => {
                  const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff User';
                  const isSelf = s._id === currentUser?._id;

                  return (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {fullName}
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{s.email}</div>
                        <div className="text-[11px] text-gray-500">{s.phone || 'No phone recorded'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            s.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800'
                              : s.role === 'store_manager'
                              ? 'bg-blue-100 text-blue-800'
                              : s.role === 'order_manager'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-emerald-700 font-medium capitalize text-[11px]">
                          <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                        v{s.tokenVersion || 1}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {isSuperAdmin && !isSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRoleTargetStaff(s);
                                setNewRole(s.role);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Shield className="w-3 h-3" /> Change Role
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeSessions(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <KeyRound className="w-3 h-3" /> Revoke
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Add New Staff Account
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={createData.firstName}
                    onChange={(e) => setCreateData({ ...createData, firstName: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={createData.lastName}
                    onChange={(e) => setCreateData({ ...createData, lastName: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Phone (10 digits)</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={createData.phone}
                  onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assign Role</label>
                <select
                  value={createData.role}
                  onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                >
                  <option value="store_manager">Store Manager</option>
                  <option value="order_manager">Order Manager</option>
                  <option value="support_staff">Support Staff</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {createLoading ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {roleTargetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Update Staff Role</h3>
              <button
                type="button"
                onClick={() => setRoleTargetStaff(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select new role for <strong>{roleTargetStaff.email}</strong>:
            </p>

            <form onSubmit={handleUpdateRoleSubmit} className="space-y-4">
              <div>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-emerald-500"
                >
                  <option value="store_manager">Store Manager</option>
                  <option value="order_manager">Order Manager</option>
                  <option value="support_staff">Support Staff</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleTargetStaff(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleLoading}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  {roleLoading ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStaffPage;
