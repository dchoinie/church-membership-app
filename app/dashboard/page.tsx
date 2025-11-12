import Image from "next/image";

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
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Member Directory</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Manage church members and their information
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Track attendance for services and events
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Giving</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Manage donations and giving records
          </p>
        </div>
      </div>
    </div>
  );
}

