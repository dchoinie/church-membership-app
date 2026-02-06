"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Send, 
  Download, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface Statement {
  id: string;
  householdId: string;
  householdName: string;
  year: number;
  totalAmount: number;
  statementNumber?: string | null;
  generatedAt: string;
  sentAt?: string | null;
  emailStatus?: string | null;
}

export default function GivingStatementsPage() {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedStatements, setSelectedStatements] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "sent" | "unsent">("all");

  // Generate list of years (current year and past 10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadStatements();
  }, [year]);

  const loadStatements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/giving-statements?year=${year}`);
      if (!response.ok) {
        throw new Error("Failed to load statements");
      }
      const data = await response.json();
      setStatements(data.statements || []);
    } catch (error) {
      console.error("Error loading statements:", error);
      toast.error("Failed to load statements");
    } finally {
      setIsLoading(false);
    }
  };

  const generateStatements = async (previewOnly: boolean = false) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/giving-statements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, preview: previewOnly }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Failed to generate statements");
      }

      if (previewOnly) {
        // Open preview in new tab
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        toast.success("Preview generated");
      } else {
        const data = await response.json();
        toast.success(`Generated ${data.generated} statement(s)`);
        if (data.errors && data.errors.length > 0) {
          toast.warning(`${data.errors.length} statement(s) had errors`);
        }
        loadStatements();
      }
    } catch (error) {
      console.error("Error generating statements:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate statements");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendStatements = async () => {
    if (selectedStatements.size === 0) {
      toast.error("Please select statements to send");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/giving-statements/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementIds: Array.from(selectedStatements) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Failed to send statements");
      }

      const data = await response.json();
      toast.success(`Sent ${data.sent} statement(s)`);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} statement(s) failed to send`);
      }
      
      setSelectedStatements(new Set());
      loadStatements();
    } catch (error) {
      console.error("Error sending statements:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send statements");
    } finally {
      setIsSending(false);
    }
  };

  const downloadStatement = async (statementId: string, householdName: string, statementNumber?: string | null) => {
    try {
      const response = await fetch(`/api/giving-statements/${statementId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download statement");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `giving-statement-${year}-${statementNumber || householdName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading statement:", error);
      toast.error("Failed to download statement");
    }
  };

  const toggleStatementSelection = (statementId: string) => {
    const newSelection = new Set(selectedStatements);
    if (newSelection.has(statementId)) {
      newSelection.delete(statementId);
    } else {
      newSelection.add(statementId);
    }
    setSelectedStatements(newSelection);
  };

  const toggleAllStatements = () => {
    if (selectedStatements.size === filteredStatements.length) {
      setSelectedStatements(new Set());
    } else {
      setSelectedStatements(new Set(filteredStatements.map((s) => s.id)));
    }
  };

  const filteredStatements = statements.filter((s) => {
    if (filter === "sent") return s.sentAt;
    if (filter === "unsent") return !s.sentAt;
    return true;
  });

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Giving Statements</h1>
        <p className="text-muted-foreground mt-1">
          Generate and send IRS-compliant year-end giving statements to members
        </p>
      </div>

      {/* Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Statements</CardTitle>
          <CardDescription>
            Create giving statements for all households with contributions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="year">Tax Year</Label>
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => generateStatements(true)}
                variant="outline"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Preview
              </Button>
              <Button
                onClick={() => generateStatements(false)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Generate All
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              Make sure your church's tax information is complete in Settings before generating statements.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statements List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Statements</CardTitle>
              <CardDescription>
                {year} giving statements ({filteredStatements.length} total)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as typeof filter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statements</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="unsent">Not Sent</SelectItem>
                </SelectContent>
              </Select>
              {selectedStatements.size > 0 && (
                <Button
                  onClick={sendStatements}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send ({selectedStatements.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStatements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No statements generated yet</p>
              <p className="text-sm mt-1">
                Click "Generate All" above to create statements for {year}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStatements.size === filteredStatements.length}
                      onCheckedChange={toggleAllStatements}
                    />
                  </TableHead>
                  <TableHead>Household</TableHead>
                  <TableHead>Statement #</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStatements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStatements.has(statement.id)}
                        onCheckedChange={() => toggleStatementSelection(statement.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {statement.householdName}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {statement.statementNumber || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(statement.totalAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(statement.generatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {statement.sentAt ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sent
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Sent</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          downloadStatement(
                            statement.id,
                            statement.householdName,
                            statement.statementNumber
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
