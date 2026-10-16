import { useState, type FormEvent } from "react";
import { Alert } from "component-lib/alert";
import { Button } from "component-lib/button";
import { Input } from "component-lib/input";
import { prime } from "../api/cache";
import { api } from "../api/client";
import { AuthLayout } from "../components/AuthLayout";
import type { Session } from "../shared/types";

/** First run: name the workspace and create the owner account. Only reachable while no account exists. */
export function Setup() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailInvalid = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email);
  const short = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = workspaceName.trim() && name.trim() && email && !emailInvalid && password.length >= 8 && confirm === password;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const session = await api<Session>("/auth/setup", {
        method: "POST",
        body: {
          workspaceName,
          name,
          email,
          password,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      prime("auth-status", { setupRequired: false });
      prime("session", session);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Set up your workspace"
      description="You’ll be the workspace owner. You can add your team once you’re in."
    >
      <form className="stack form-stack" onSubmit={onSubmit} noValidate>
        {error && <Alert variant="danger" size="sm" title={error} />}
        <Input label="Workspace name" description="Usually your company or team." value={workspaceName}
          onValueChange={setWorkspaceName} required autoFocus maxLength={60} />
        <Input label="Your name" autoComplete="name" value={name} onValueChange={setName} required maxLength={80} />
        <Input label="Work email" type="email" autoComplete="username" value={email} onValueChange={setEmail} required
          error={emailInvalid ? "Enter a valid email address" : undefined} />
        <Input label="Password" type="password" autoComplete="new-password" value={password} onValueChange={setPassword}
          required description="At least 8 characters." error={short ? "Use at least 8 characters" : undefined} />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={confirm}
          onValueChange={setConfirm} required error={mismatch ? "The passwords don’t match" : undefined} />
        <Button type="submit" fullWidth loading={busy} disabled={!ready}>
          Create workspace
        </Button>
      </form>
    </AuthLayout>
  );
}
