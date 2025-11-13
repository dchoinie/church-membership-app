"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  membershipDate: string;
  familyRole: string | null;
  email: string | null;
  phone: string | null;
}

interface Family {
  id: string;
  parentFamilyId: string | null;
}

export default function FamilyViewPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [parentFamily, setParentFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.familyId;
      setFamilyId(id);
      await fetchFamilyData(id);
    };
    init();
  }, [params]);

  const fetchFamilyData = async (id: string) => {
    try {
      const response = await fetch(`/api/families/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setFamily(data.family);
        if (data.parentFamily) {
          setParentFamily(data.parentFamily);
        }
      } else {
        console.error("Failed to fetch family data");
      }
    } catch (error) {
      console.error("Error fetching family data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFamilyDisplayName = (): string => {
    if (members.length === 0) {
      return `Family ${familyId.slice(0, 8)}`;
    }
    if (members.length === 1) {
      return `Family of ${members[0].firstName} ${members[0].lastName}`;
    }
    if (members.length === 2) {
      return `Family of ${members[0].firstName} & ${members[1].firstName} ${members[1].lastName}`;
    }
    return `Family of ${members[0].firstName} ${members[0].lastName} (+${members.length - 1})`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading family information...
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          No family members found or family does not exist.
        </div>
        <div className="text-center">
          <Link href="/membership">
            <Button variant="outline">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Members
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getFamilyDisplayName()}</h1>
          <p className="text-muted-foreground mt-2">
            {parentFamily ? (
              <>
                Part of{" "}
                <Link
                  href={`/membership/family/${parentFamily.id}`}
                  className="text-primary hover:underline"
                >
                  Extended Family {parentFamily.id.slice(0, 8)}
                </Link>
              </>
            ) : (
              "Extended Family"
            )}
          </p>
        </div>
        <Link href="/membership">
          <Button variant="outline">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Members
          </Button>
        </Link>
      </div>

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle>Family Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this
            family
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Member Since</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.firstName} {member.lastName}
                  </TableCell>
                  <TableCell>{member.familyRole || "N/A"}</TableCell>
                  <TableCell>{formatDate(member.membershipDate)}</TableCell>
                  <TableCell>{member.email || "N/A"}</TableCell>
                  <TableCell>{member.phone || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/membership/${member.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

