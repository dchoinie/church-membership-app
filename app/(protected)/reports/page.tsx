"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { DownloadIcon, FileTextIcon, Loader2 } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Send, 
  Download, 
  CheckCircle2,
  AlertTriangle,
  Eye,
  Settings,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface Household {
  id: string;
  name: string | null;
  type: string | null;
  envelopeNumber: number | null;
  memberCount: number;
}

interface GivingReportFormData {
  dateRange: string;
  startDate: string;
  endDate: string;
}

interface MembershipReportFormData {
  participationStatuses: string[];
}

interface CongressionalStatisticsFormData {
  dateRange: string;
  startDate: string;
  endDate: string;
}

interface AttendanceReportFormData {
  dateRange: string;
  startDate: string;
  endDate: string;
}

const PARTICIPATION_STATUSES = [
  { value: "active", label: "Active" },
  { value: "deceased", label: "Deceased" },
  { value: "homebound", label: "Homebound" },
  { value: "military", label: "Military" },
  { value: "inactive", label: "Inactive" },
  { value: "school", label: "School" },
];

const ALL_STATUS_VALUES = PARTICIPATION_STATUSES.map(s => s.value);

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

export default function ReportsPage() {
  const router = useRouter();
  const { canViewReports } = usePermissions();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [generatingGivingReport, setGeneratingGivingReport] = useState(false);
  const [generatingMembershipReport, setGeneratingMembershipReport] = useState(false);
  const [generatingCongressionalReport, setGeneratingCongressionalReport] = useState(false);
  const [generatingAttendanceReport, setGeneratingAttendanceReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Giving statements state
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedStatements, setSelectedStatements] = useState<Set<string>>(new Set());
  const [isLoadingStatements, setIsLoadingStatements] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "sent" | "unsent">("all");
  const [showMissingTaxDialog, setShowMissingTaxDialog] = useState(false);
  const [missingTaxFields, setMissingTaxFields] = useState<string[]>([]);
  const [pendingGeneration, setPendingGeneration] = useState<{ preview: boolean } | null>(null);
  const [deletingStatementId, setDeletingStatementId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<{ id: string; householdName: string } | null>(null);

  const givingForm = useForm<GivingReportFormData>({
    defaultValues: {
      dateRange: "year-to-date",
      startDate: "",
      endDate: "",
    },
  });

  const membershipForm = useForm<MembershipReportFormData>({
    defaultValues: {
      participationStatuses: ALL_STATUS_VALUES, // Default to "all" (all statuses selected)
    },
  });

  const attendanceForm = useForm<AttendanceReportFormData>({
    defaultValues: {
      dateRange: "year-to-date",
      startDate: "",
      endDate: "",
    },
  });

  // Calculate default date range for congressional statistics (last full year)
  const getLastFullYear = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed (0 = January)
    
    // If it's January, use previous year. Otherwise use current year minus 1.
    const reportYear = currentMonth === 0 ? currentYear - 1 : currentYear - 1;
    return {
      startDate: `${reportYear}-01-01`,
      endDate: `${reportYear}-12-31`,
    };
  };

  const congressionalForm = useForm<CongressionalStatisticsFormData>({
    defaultValues: {
      dateRange: "last-full-year",
      startDate: getLastFullYear().startDate,
      endDate: getLastFullYear().endDate,
    },
  });

  const selectedDateRange = givingForm.watch("dateRange");
  const selectedCongressionalDateRange = congressionalForm.watch("dateRange");
  const selectedAttendanceDateRange = attendanceForm.watch("dateRange");

  // Generate list of years (current year and past 10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);

  // Fetch households for dropdown
  useEffect(() => {
    const fetchHouseholds = async () => {
      try {
        const response = await fetch("/api/reports/households");
        if (response.ok) {
          const data = await response.json();
          setHouseholds(data.households || []);
        }
      } catch (error) {
        console.error("Error fetching households:", error);
      } finally {
        setLoadingHouseholds(false);
      }
    };
    fetchHouseholds();
  }, []);

  // Load giving statements function
  const loadStatements = async () => {
    setIsLoadingStatements(true);
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
      setIsLoadingStatements(false);
    }
  };

  // Load giving statements when year changes
  useEffect(() => {
    loadStatements();
  }, [year]);

  const generateStatements = async (previewOnly: boolean = false, skipValidation: boolean = false) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/giving-statements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, preview: previewOnly, skipValidation }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Failed to generate statements");
      }

      // Check content type to determine if it's JSON or PDF blob
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/pdf")) {
        // Preview PDF response
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        toast.success("Preview generated");
        setIsGenerating(false);
        return;
      }

      // Parse as JSON for other responses
      const data = await response.json();

      // Check if confirmation is required for missing tax info
      if (data.requiresConfirmation && !skipValidation) {
        setMissingTaxFields(data.missing || []);
        setPendingGeneration({ preview: previewOnly });
        setShowMissingTaxDialog(true);
        setIsGenerating(false);
        return;
      }

      if (previewOnly) {
        // This shouldn't happen if we got here, but handle it just in case
        toast.success("Preview generated");
      } else {
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

  const handleContinueWithoutTaxInfo = () => {
    setShowMissingTaxDialog(false);
    if (pendingGeneration) {
      generateStatements(pendingGeneration.preview, true);
      setPendingGeneration(null);
    }
  };

  const handleGoToSettings = () => {
    setShowMissingTaxDialog(false);
    setPendingGeneration(null);
    router.push("/settings");
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

  const handleDeleteClick = (statementId: string, householdName: string) => {
    setStatementToDelete({ id: statementId, householdName });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!statementToDelete) return;

    setDeletingStatementId(statementToDelete.id);
    try {
      const response = await apiFetch(`/api/giving-statements/${statementToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete statement");
      }

      toast.success("Statement deleted successfully");
      setShowDeleteDialog(false);
      setStatementToDelete(null);
      loadStatements();
    } catch (error) {
      console.error("Error deleting statement:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete statement");
    } finally {
      setDeletingStatementId(null);
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

  // Calculate date ranges based on selection
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    let startDate = "";
    let endDate = today.toISOString().split("T")[0];

    switch (selectedDateRange) {
      case "year-to-date":
        startDate = `${currentYear}-01-01`;
        break;
      case "full-year":
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
        break;
      case "3-months": {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "6-months": {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        startDate = sixMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "custom":
        // Don't auto-fill for custom
        return;
      default:
        startDate = `${currentYear}-01-01`;
    }

    if (selectedDateRange !== "custom") {
      givingForm.setValue("startDate", startDate);
      givingForm.setValue("endDate", endDate);
    }
  }, [selectedDateRange, givingForm]);

  // Calculate date ranges for congressional statistics report
  useEffect(() => {
    let startDate = "";
    let endDate = "";

    switch (selectedCongressionalDateRange) {
      case "last-full-year": {
        const lastFullYear = getLastFullYear();
        startDate = lastFullYear.startDate;
        endDate = lastFullYear.endDate;
        break;
      }
      case "custom":
        // Don't auto-fill for custom
        return;
      default: {
        const lastFullYear = getLastFullYear();
        startDate = lastFullYear.startDate;
        endDate = lastFullYear.endDate;
      }
    }

    if (selectedCongressionalDateRange !== "custom") {
      congressionalForm.setValue("startDate", startDate);
      congressionalForm.setValue("endDate", endDate);
    }
  }, [selectedCongressionalDateRange, congressionalForm]);

  // Calculate date ranges for attendance report
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    let startDate = "";
    let endDate = today.toISOString().split("T")[0];

    switch (selectedAttendanceDateRange) {
      case "year-to-date":
        startDate = `${currentYear}-01-01`;
        break;
      case "full-year":
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
        break;
      case "3-months": {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "6-months": {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        startDate = sixMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "custom":
        // Don't auto-fill for custom
        return;
      default:
        startDate = `${currentYear}-01-01`;
    }

    if (selectedAttendanceDateRange !== "custom") {
      attendanceForm.setValue("startDate", startDate);
      attendanceForm.setValue("endDate", endDate);
    }
  }, [selectedAttendanceDateRange, attendanceForm]);

  // Helper function to download CSV
  const downloadCsv = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw error;
    }
  };

  const onGivingReportSubmit = async (data: GivingReportFormData) => {
    setError(null);
    setSuccess(null);
    setGeneratingGivingReport(true);

    try {
      const startDate = data.startDate || givingForm.getValues("startDate");
      const endDate = data.endDate || givingForm.getValues("endDate");

      if (!startDate || !endDate) {
        throw new Error("Please select a date range");
      }

      if (new Date(startDate) > new Date(endDate)) {
        throw new Error("Start date must be before or equal to end date");
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
        format: "csv",
      });

      const url = `/api/reports/giving?${params.toString()}`;
      const filename = `giving-report-by-service-${new Date().toISOString().split("T")[0]}.csv`;

      await downloadCsv(url, filename);
      setSuccess("Giving report generated successfully!");
    } catch (error) {
      console.error("Error generating giving report:", error);
      setError(error instanceof Error ? error.message : "Failed to generate giving report");
    } finally {
      setGeneratingGivingReport(false);
    }
  };

  const onMembershipReportSubmit = async (data: MembershipReportFormData) => {
    setError(null);
    setSuccess(null);
    setGeneratingMembershipReport(true);

    try {
      // Validate that at least one status is selected
      if (!data.participationStatuses || data.participationStatuses.length === 0) {
        throw new Error("Please select at least one participation status");
      }

      const params = new URLSearchParams({
        type: "member",
        format: "csv",
      });

      // If all statuses are selected, don't send participation param (API defaults to all)
      // Otherwise, send the selected statuses
      if (data.participationStatuses.length < ALL_STATUS_VALUES.length) {
        params.append("participation", data.participationStatuses.join(","));
      }

      const url = `/api/reports/membership?${params.toString()}`;
      const filename = `membership-report-${new Date().toISOString().split("T")[0]}.csv`;

      await downloadCsv(url, filename);
      setSuccess("Membership report generated successfully!");
    } catch (error) {
      console.error("Error generating membership report:", error);
      setError(error instanceof Error ? error.message : "Failed to generate membership report");
    } finally {
      setGeneratingMembershipReport(false);
    }
  };

  const onAttendanceReportSubmit = async (data: AttendanceReportFormData) => {
    setError(null);
    setSuccess(null);
    setGeneratingAttendanceReport(true);

    try {
      const startDate = data.startDate || attendanceForm.getValues("startDate");
      const endDate = data.endDate || attendanceForm.getValues("endDate");

      if (!startDate || !endDate) {
        throw new Error("Please select a date range");
      }

      if (new Date(startDate) > new Date(endDate)) {
        throw new Error("Start date must be before or equal to end date");
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
        format: "csv",
      });

      const url = `/api/reports/attendance-report?${params.toString()}`;
      const filename = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;

      await downloadCsv(url, filename);
      setSuccess("Attendance report generated successfully!");
    } catch (error) {
      console.error("Error generating attendance report:", error);
      setError(error instanceof Error ? error.message : "Failed to generate attendance report");
    } finally {
      setGeneratingAttendanceReport(false);
    }
  };

  const onCongressionalStatisticsSubmit = async (data: CongressionalStatisticsFormData) => {
    setError(null);
    setSuccess(null);
    setGeneratingCongressionalReport(true);

    try {
      const startDate = data.startDate || congressionalForm.getValues("startDate");
      const endDate = data.endDate || congressionalForm.getValues("endDate");

      if (!startDate || !endDate) {
        throw new Error("Please select a date range");
      }

      if (new Date(startDate) > new Date(endDate)) {
        throw new Error("Start date must be before or equal to end date");
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const url = `/api/reports/congressional-statistics?${params.toString()}`;
      const filename = `congressional-statistics-report-${startDate}-to-${endDate}.csv`;

      await downloadCsv(url, filename);
      setSuccess("Congressional Statistics report generated successfully!");
    } catch (error) {
      console.error("Error generating congressional statistics report:", error);
      setError(error instanceof Error ? error.message : "Failed to generate congressional statistics report");
    } finally {
      setGeneratingCongressionalReport(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Generate giving and membership reports
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General Church Reports</TabsTrigger>
          <TabsTrigger value="tax-statements">Individual Tax Statements</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Giving Reports Section */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileTextIcon className="h-4 w-4 md:h-5 md:w-5" />
            Giving Reports
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Generate reports of total giving broken down by service and giving category for the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...givingForm}>
            <form onSubmit={givingForm.handleSubmit(onGivingReportSubmit)} className="space-y-4">
              <FormField
                control={givingForm.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="year-to-date">Year-to-Date</SelectItem>
                        <SelectItem value="full-year">Full Year (Current Year)</SelectItem>
                        <SelectItem value="3-months">Last 3 Months</SelectItem>
                        <SelectItem value="6-months">Last 6 Months</SelectItem>
                        <SelectItem value="custom">Custom Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedDateRange === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={givingForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={givingForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {canViewReports && (
                <Button type="submit" disabled={generatingGivingReport} className="cursor-pointer">
                  {generatingGivingReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Generate Giving Report
                    </>
                  )}
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

        {/* Membership Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <FileTextIcon className="h-4 w-4 md:h-5 md:w-5" />
              Membership Reports
            </CardTitle>
            <CardDescription>
              Generate reports of all members grouped by household, filtered by participation status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...membershipForm}>
              <form onSubmit={membershipForm.handleSubmit(onMembershipReportSubmit)} className="space-y-4">
                <FormField
                  name="participationStatuses"
                  render={() => {
                    const selectedStatuses = membershipForm.watch("participationStatuses") || [];
                    const allSelected = selectedStatuses.length === ALL_STATUS_VALUES.length;
                    
                    return (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Participation Status</FormLabel>
                        </div>
                        {/* "All" option */}
                        <FormField
                          control={membershipForm.control}
                          name="participationStatuses"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-2 pb-2 border-b">
                                <FormControl>
                                  <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked ? [...ALL_STATUS_VALUES] : []);
                                    }}
                                  />
                                </FormControl>
                              <FormLabel className="font-semibold">
                                All
                              </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                        {/* Individual status options */}
                        {PARTICIPATION_STATUSES.map((status) => (
                          <FormField
                            key={status.value}
                            control={membershipForm.control}
                            name="participationStatuses"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={status.value}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(status.value)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          const newValue = [...(field.value || []), status.value];
                                          field.onChange(newValue);
                                        } else {
                                          field.onChange(
                                            field.value?.filter(
                                              (value) => value !== status.value
                                            ) || []
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {status.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <Button type="submit" disabled={generatingMembershipReport} className="cursor-pointer">
                  {generatingMembershipReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Generate Membership Report
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Attendance Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <FileTextIcon className="h-4 w-4 md:h-5 md:w-5" />
              Attendance Reports
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Generate reports of service attendance including members, guests, and communion counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...attendanceForm}>
              <form onSubmit={attendanceForm.handleSubmit(onAttendanceReportSubmit)} className="space-y-4">
                <FormField
                  control={attendanceForm.control}
                  name="dateRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Range</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select date range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="year-to-date">Year-to-Date</SelectItem>
                          <SelectItem value="full-year">Full Year (Current Year)</SelectItem>
                          <SelectItem value="3-months">Last 3 Months</SelectItem>
                          <SelectItem value="6-months">Last 6 Months</SelectItem>
                          <SelectItem value="custom">Custom Date Range</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedAttendanceDateRange === "custom" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={attendanceForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={attendanceForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {canViewReports && (
                  <Button type="submit" disabled={generatingAttendanceReport} className="cursor-pointer">
                    {generatingAttendanceReport ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Generate Attendance Report
                      </>
                    )}
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Congressional Statistics Report Section */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Congressional Statistics Report
          </CardTitle>
          <CardDescription>
            Generate a comprehensive statistics report including membership, baptisms, confirmations, losses, and attendance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...congressionalForm}>
            <form onSubmit={congressionalForm.handleSubmit(onCongressionalStatisticsSubmit)} className="space-y-4">
              <FormField
                control={congressionalForm.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="last-full-year">Last Full Year</SelectItem>
                        <SelectItem value="custom">Custom Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCongressionalDateRange === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={congressionalForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={congressionalForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {canViewReports && (
                <Button type="submit" disabled={generatingCongressionalReport} className="cursor-pointer">
                  {generatingCongressionalReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Generate Congressional Statistics Report
                    </>
                  )}
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax-statements" className="mt-6">
          <div className="space-y-6">
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
                    Make sure your church&apos;s tax information is complete in Settings before generating statements.
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
                {isLoadingStatements ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredStatements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No statements generated yet</p>
                    <p className="text-sm mt-1">
                      Click &quot;Generate All&quot; above to create statements for {year}
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
                            <div className="flex items-center justify-end gap-2">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteClick(statement.id, statement.householdName)
                                }
                                disabled={deletingStatementId === statement.id}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                {deletingStatementId === statement.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Statement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the giving statement for {statementToDelete?.householdName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setStatementToDelete(null);
              }}
              disabled={deletingStatementId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingStatementId !== null}
            >
              {deletingStatementId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Tax Info Dialog */}
      <Dialog 
        open={showMissingTaxDialog} 
        onOpenChange={(open) => {
          setShowMissingTaxDialog(open);
          if (!open) {
            // Clear pending generation if dialog is closed without choosing an option
            setPendingGeneration(null);
            setMissingTaxFields([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Missing Tax Information
            </DialogTitle>
            <DialogDescription>
              Some recommended tax information is missing from your church settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The following fields are recommended for IRS-compliant giving statements:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {missingTaxFields.map((field) => (
                <li key={field} className="text-muted-foreground">
                  {field}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              You can continue to generate statements without this information, or update your settings first.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleGoToSettings}
              className="w-full sm:w-auto"
            >
              <Settings className="mr-2 h-4 w-4" />
              Go to Settings
            </Button>
            <Button
              onClick={handleContinueWithoutTaxInfo}
              className="w-full sm:w-auto"
            >
              Continue Without Info
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

