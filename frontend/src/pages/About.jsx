import { Card, CardBody, CardHeader, Badge } from "../components/UI.jsx";

export default function About() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="About Travel Planner"
          subtitle="A clean AI travel planner built with a modern full-stack setup"
          right={<Badge>v1</Badge>}
        />
        <CardBody className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">
            Travel Planner helps you generate realistic day-by-day itineraries
            (morning / afternoon / evening) based on destination, dates, pace, budget, and interests.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Trips are saved to your account so you can come back anytime, edit, regenerate,
            and plan better over time.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-extrabold text-slate-900">Frontend</div>
              <div className="mt-1 text-slate-600">React + Tailwind + reusable UI kit</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-extrabold text-slate-900">Backend</div>
              <div className="mt-1 text-slate-600">Express + MongoDB + cookie auth</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}