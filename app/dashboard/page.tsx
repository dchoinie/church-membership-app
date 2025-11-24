import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to Good Shepherd Church Admin Dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/membership" className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold">Member Directory</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Manage church members and their information
          </p>
        </Link>
        <Link href="/giving" className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold">Giving</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Manage donations and giving records
          </p>
        </Link>
        <Link href="/reports" className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground mt-2">
            View and generate reports
          </p>
        </Link>
      </div>
    </div>
  );
}

