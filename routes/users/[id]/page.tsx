import type { Props } from "./loader.ts";

export default function UserDetailPage({ user }: Props) {
  if (!user) {
    return (
      <div>
        <h1>User Not Found</h1>
        <a href="/users">Back to users</a>
      </div>
    );
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Created: {user.created_at}</p>
      <a href="/users">Back to users</a>
    </div>
  );
}
