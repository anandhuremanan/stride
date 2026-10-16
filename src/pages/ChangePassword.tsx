import { useState, type FormEvent } from "react";
import { Alert } from "component-lib/alert";
import { Button } from "component-lib/button";
import { Input } from "component-lib/input";
import { changePassword } from "../api/queries";
import { useAuth } from "../auth/context";
import { AuthLayout } from "../components/AuthLayout";
import { firstName } from "../lib/format";

/**
 * Shown instead of the app while the account still has the temporary password
 * an admin handed over. Also used from the account menu via `PasswordForm`.
 */
export function ChangePassword() {
  const { user, workspace, logout } = useAuth();
  return (
    <AuthLayout
      title={`Welcome, ${firstName(user.name)}`}
      description={`Choose your own password to finish joining ${workspace.name}.`}
      footer={
        <Button variant="link" onClick={() => void logout()}>
          Sign out
        </Button>
      }
    >
      <PasswordForm currentLabel="Temporary password" submitLabel="Save and continue" />
    </AuthLayout>
  );
}

export function PasswordForm({
  currentLabel = "Current password",
  submitLabel = "Change password",
  onDone,
}: {
  currentLabel?: string;
  submitLabel?: string;
  onDone?: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const short = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && confirm !== next;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack form-stack" onSubmit={onSubmit} noValidate>
      {error && <Alert variant="danger" size="sm" title={error} />}
      <Input label={currentLabel} type="password" autoComplete="current-password" value={current}
        onValueChange={setCurrent} required autoFocus />
      <Input label="New password" type="password" autoComplete="new-password" value={next} onValueChange={setNext}
        required description="At least 8 characters." error={short ? "Use at least 8 characters" : undefined} />
      <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm}
        onValueChange={setConfirm} required error={mismatch ? "The passwords don’t match" : undefined} />
      <Button type="submit" fullWidth loading={busy} disabled={!current || next.length < 8 || confirm !== next}>
        {submitLabel}
      </Button>
    </form>
  );
}
