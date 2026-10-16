import type { ReactNode } from "react";
import { Layers2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "component-lib/card";

/** The centred card used by setup, sign-in and password screens. */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="login">
      <div className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark" aria-hidden>
            <Layers2 size={19} strokeWidth={1.75} />
          </span>
          <span className="brand-name">stride</span>
        </div>
        <Card padding="lg">
          <CardHeader title={<h1 className="login-title">{title}</h1>} description={description} />
          <CardBody>{children}</CardBody>
        </Card>
        {footer && <div className="login-footer">{footer}</div>}
      </div>
    </main>
  );
}
