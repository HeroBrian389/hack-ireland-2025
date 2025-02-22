"use client";

import { useParams } from "next/navigation";
import { api } from "~/trpc/react";

export default function SingleUserPage() {
  const { userId } = useParams() as { userId: string };

  // Use the admin.getUserById procedure
  const { data, isLoading, isError, error } = api.admin.getUserById.useQuery({ userId });

  if (isLoading) return <div>Loading user details...</div>;
  if (isError) return <div className="text-red-500">Error: {error.message}</div>;
  if (!data) return <div>User not found</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        User: {data.firstName} {data.lastName}
      </h2>
      <p>
        <strong>Email:</strong> {data.email ?? "(none)"}
      </p>
      <p>
        <strong>Created:</strong>{" "}
        {new Date(data.createdAt).toLocaleString()}
      </p>
      {/* Show sessions, accounts, etc. */}
      <h3 className="mt-6 font-semibold">Sessions:</h3>
      <ul className="list-disc ml-5">
        {data.sessions.map((s) => (
          <li key={s.id}>{s.id} - {s.state}</li>
        ))}
      </ul>
    </div>
  );
}
