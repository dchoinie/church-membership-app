"use client";

import Link from "next/link";
import { Users, DollarSign, Calendar, BarChart3, FileText, Settings, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -my-8">
      <div className="shrink-0 pb-4 md:pb-6 pt-4 md:pt-8">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Welcome to Good Shepherd Church Admin Dashboard
        </p>
      </div>

      {/* Quick Links */}
      <div className="flex-1 grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 min-h-0 pb-4 md:pb-8">
        <Link href="/membership">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Member Directory</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                View and manage all church members, their contact information, and household details.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/giving">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Giving</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Track and manage all donations, including current, mission, memorials, debt, school, and miscellaneous giving.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/attendance">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Attendance</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Record and track member attendance for services and communion participation.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Analytics</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                View comprehensive analytics and visualizations for attendance, demographics, and giving trends.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Reports</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Generate and download detailed reports for giving, membership, and other church data.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manage-admin-access">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Settings className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Manage Admin Access</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Invite new administrators, view all admin users, and manage access permissions for the church management system.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

