"use client";

import { api } from "~/trpc/react";

export default function AdminUsersPage() {
  // Use our new adminRouter -> getAllUsers procedure
  const { data, isLoading, isError, error } = api.admin.getAllUsers.useQuery();

  if (isLoading) return <div>Loading users...</div>;
  if (isError) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">All Users</h2>
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border-b border-gray-300">ID</th>
            <th className="p-2 border-b border-gray-300">Name</th>
            <th className="p-2 border-b border-gray-300">Email</th>
            <th className="p-2 border-b border-gray-300">Created</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="p-2 border-b border-gray-200">{user.id}</td>
              <td className="p-2 border-b border-gray-200">
                {user.firstName} {user.lastName}
              </td>
              <td className="p-2 border-b border-gray-200">{user.email ?? "(none)"}</td>
              <td className="p-2 border-b border-gray-200">
                {new Date(user.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
