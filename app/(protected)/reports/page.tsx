"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { DownloadIcon, FileTextIcon, Loader2 } from "lucide-react";

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

interface Household {
  id: string;
  name: string | null;
  type: string | null;
  envelopeNumber: number | null;
  memberCount: number;
}

interface GivingReportFormData {
  householdId: string;
  dateRange: string;
  startDate: string;
  endDate: string;
}

interface MembershipReportFormData {
  participationStatuses: string[];
  householdId: string;
  type: string;
}

interface CongressionalStatisticsFormData {
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

export default function ReportsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [generatingGivingReport, setGeneratingGivingReport] = useState(false);
  const [generatingMembershipReport, setGeneratingMembershipReport] = useState(false);
  const [generatingCongressionalReport, setGeneratingCongressionalReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const givingForm = useForm<GivingReportFormData>({
    defaultValues: {
      householdId: "all",
      dateRange: "year-to-date",
      startDate: "",
      endDate: "",
    },
  });

  const membershipForm = useForm<MembershipReportFormData>({
    defaultValues: {
      participationStatuses: ALL_STATUS_VALUES, // Default to "all" (all statuses selected)
      householdId: "all",
      type: "member",
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

      if (data.householdId && data.householdId !== "all") {
        params.append("householdId", data.householdId);
      }

      const url = `/api/reports/giving?${params.toString()}`;
      const filename = `giving-report-${new Date().toISOString().split("T")[0]}.csv`;

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
        type: data.type,
        format: "csv",
      });

      // If all statuses are selected, don't send participation param (API defaults to all)
      // Otherwise, send the selected statuses
      if (data.participationStatuses.length < ALL_STATUS_VALUES.length) {
        params.append("participation", data.participationStatuses.join(","));
      }

      if (data.householdId && data.householdId !== "all") {
        params.append("householdId", data.householdId);
      }

      const url = `/api/reports/membership?${params.toString()}`;
      const reportType = data.type === "household" ? "household" : "member";
      const filename = `membership-${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;

      await downloadCsv(url, filename);
      setSuccess("Membership report generated successfully!");
    } catch (error) {
      console.error("Error generating membership report:", error);
      setError(error instanceof Error ? error.message : "Failed to generate membership report");
    } finally {
      setGeneratingMembershipReport(false);
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

      {/* Giving Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileTextIcon className="h-4 w-4 md:h-5 md:w-5" />
            Giving Reports
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Generate reports of giving records by household and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...givingForm}>
            <form onSubmit={givingForm.handleSubmit(onGivingReportSubmit)} className="space-y-4">
              <FormField
                control={givingForm.control}
                name="householdId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Household (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "all"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All households" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All households</SelectItem>
                        {loadingHouseholds ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                        ) : (
                          households.map((household) => (
                            <SelectItem key={household.id} value={household.id}>
                              {household.name}
                              {household.envelopeNumber !== null && ` - Envelope #${household.envelopeNumber}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            Generate reports of members or households filtered by participation status
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
                              <FormLabel className="font-normal font-semibold">
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

              <FormField
                control={membershipForm.control}
                name="householdId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Household (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "all"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All households" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All households</SelectItem>
                        {loadingHouseholds ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                        ) : (
                          households.map((household) => (
                            <SelectItem key={household.id} value={household.id}>
                              {household.name}
                              {household.envelopeNumber !== null && ` - Envelope #${household.envelopeNumber}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={membershipForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">Individual Members</SelectItem>
                        <SelectItem value="household">Households</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
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
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

