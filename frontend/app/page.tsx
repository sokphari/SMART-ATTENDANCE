import { BackendStatus } from "./components/BackendStatus";

const modules = [
  "Authentication and role-based access",
  "Departments, courses, and academic terms",
  "Students, teachers, assignments, and enrollments",
  "Class schedules with conflict validation",
  "Teacher attendance sessions and dynamic QR tokens",
  "Student GPS check-in and attendance reports",
  "Attendance corrections and audit logs",
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Smart Attendance</p>
        <h1>IT Smos Sne Tea o Muy.</h1>
        <p className="lede">
          Next.js runs in the frontend container and proxies API requests to the
          Laravel backend.
        </p>
        <BackendStatus />
      </section>

      <section className="grid">
        <article className="card">
          <h2>Backend API</h2>
          <p>Laravel API available at the proxied path.</p>
          <code>/api/v1</code>
        </article>

        <article className="card">
          <h2>Frontend</h2>
          <p>Next.js application served by the frontend container.</p>
          <code>http://localhost:3000</code>
        </article>

        <article className="card">
          <h2>Backend direct</h2>
          <p>Direct backend access for API tools and debugging.</p>
          <code>http://localhost:8001/api/v1</code>
        </article>
      </section>

      <section className="card modules">
        <h2>Completed backend modules</h2>
        <ul>
          {modules.map((module) => (
            <li key={module}>{module}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
