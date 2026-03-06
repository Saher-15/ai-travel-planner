import { useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";

export default function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <Card>
      <CardHeader title="Contact" subtitle="Send a message (demo form)" />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
          <Input label="Name" placeholder="Your name" required />
          <Input label="Email" type="email" placeholder="you@email.com" required />
          <label className="block">
            <div className="mb-1.5 text-sm font-semibold text-slate-700">Message</div>
            <textarea
              required
              rows={5}
              placeholder="Write your message..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
            />
          </label>

          {sent && <Alert type="success">Message sent (demo). We’ll reply soon.</Alert>}

          <Button type="submit">Send</Button>
        </form>
      </CardBody>
    </Card>
  );
}