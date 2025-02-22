import { type ReactNode } from "react";

export const metadata = {
  title: "Admin Panel",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <section className="p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <nav className="mb-4 flex gap-4">
        {/* Nav links out to each data model page */}
        <a href="/admin">Home</a>
        <a href="/admin/users">Users</a>
        <a href="/admin/conversations">Conversations</a>
        {/* etc. */}
      </nav>
      <hr className="mb-6 border-gray-300" />
      {children}
    </section>
  );
}
