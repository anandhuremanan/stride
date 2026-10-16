import { useState, type FormEvent } from "react";
import { Alert } from "component-lib/alert";
import { Button } from "component-lib/button";
import { Input } from "component-lib/input";
import { prime } from "../api/cache";
import { api } from "../api/client";
import { AuthLayout } from "../components/AuthLayout";
import type { Session } from "../shared/types";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      prime("session", await api<Session>("/auth/login", { method: "POST", body: { email, password } }));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      description="Plan, build and ship together."
      footer={<p className="row-meta">New to the team? Ask your workspace admin to add you.</p>}
    >
      <form className="stack form-stack" onSubmit={onSubmit} noValidate>
        {error && <Alert variant="danger" size="sm" title={error} />}
        <Input label="Email" type="email" autoComplete="username" value={email} onValueChange={setEmail} required autoFocus />
        <Input label="Password" type="password" autoComplete="current-password" value={password}
          onValueChange={setPassword} required />
        <Button type="submit" fullWidth loading={busy} disabled={!email || !password}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
