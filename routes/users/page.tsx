import { Form, FieldError } from "../../src/components/Form.tsx";
import type { Props } from "./loader.ts";

export default function UsersPage({ users, _actionErrors }: Props & { _actionErrors?: Record<string, string> }) {
  return (
    <div>
      <h1>Users</h1>

      <Form action="/users">
        <div>
          <input name="name" placeholder="Name" required />
          <FieldError name="name" errors={_actionErrors} />
        </div>
        <div>
          <input name="email" type="email" placeholder="Email" required />
          <FieldError name="email" errors={_actionErrors} />
        </div>
        <button type="submit">Add User</button>
      </Form>

      <hr />

      {users.length === 0 ? (
        <p>No users yet. Add one above.</p>
      ) : (
        <ul>
          {users.map((user) => (
            <li>
              <a href={`/users/${user.id}`}>{user.name}</a> — {user.email}
            </li>
          ))}
        </ul>
      )}

      <a href="/">Back home</a>
    </div>
  );
}
