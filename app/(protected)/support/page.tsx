"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, HelpCircle, CheckCircle2, AlertCircle, X } from "lucide-react";

const CATEGORIES = [
  "Bug",
  "Feature Request",
  "Question",
  "Account Issue",
  "Other",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export default function SupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    description: "",
  });
  
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotErrors, setScreenshotErrors] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const errors: string[] = [];
    const validFiles: File[] = [];

    // Check total file count
    if (screenshots.length + files.length > MAX_FILES) {
      errors.push(`Maximum ${MAX_FILES} files allowed`);
      setScreenshotErrors(errors);
      return;
    }

    files.forEach((file, index) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name} is not an image file`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setScreenshotErrors(errors);
      setTimeout(() => setScreenshotErrors([]), 5000);
    }

    if (validFiles.length > 0) {
      setScreenshots([...screenshots, ...validFiles]);
    }

    // Reset input
    event.target.value = "";
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setTicketId(null);

    // Validate form
    if (!formData.name.trim() || formData.name.length < 2 || formData.name.length > 100) {
      setError("Name must be between 2 and 100 characters");
      setLoading(false);
      return;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (!formData.subject.trim() || formData.subject.length < 5 || formData.subject.length > 200) {
      setError("Subject must be between 5 and 200 characters");
      setLoading(false);
      return;
    }

    if (!formData.category) {
      setError("Please select a category");
      setLoading(false);
      return;
    }

    if (!formData.description.trim() || formData.description.length < 10 || formData.description.length > 5000) {
      setError("Description must be between 10 and 5000 characters");
      setLoading(false);
      return;
    }

    try {
      // Create FormData for file upload
      const submitFormData = new FormData();
      submitFormData.append("name", formData.name.trim());
      submitFormData.append("email", formData.email.trim());
      submitFormData.append("subject", formData.subject.trim());
      submitFormData.append("category", formData.category);
      submitFormData.append("description", formData.description.trim());

      // Append screenshots
      screenshots.forEach((file) => {
        submitFormData.append("screenshots", file);
      });

      const response = await apiFetch("/api/support/create", {
        method: "POST",
        body: submitFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit support ticket");
      }

      setSuccess("Support ticket submitted successfully!");
      setTicketId(data.ticketId || null);
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        category: "",
        description: "",
      });
      setScreenshots([]);

      // Clear success message after 10 seconds
      setTimeout(() => {
        setSuccess(null);
        setTicketId(null);
      }, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit support ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Support
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Submit a support ticket and we&apos;ll get back to you as soon as possible
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Support Ticket</CardTitle>
          <CardDescription>
            Please provide as much detail as possible to help us assist you quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of your issue"
                required
                minLength={5}
                maxLength={200}
                disabled={loading}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={loading}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Issue Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide detailed information about your issue..."
                required
                minLength={10}
                maxLength={5000}
                rows={8}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/5000 characters
              </p>
            </div>

            {/* Screenshots */}
            <div className="space-y-2">
              <Label htmlFor="screenshots">
                Screenshots (Optional)
              </Label>
              <Input
                id="screenshots"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={loading || screenshots.length >= MAX_FILES}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Maximum {MAX_FILES} files, {MAX_FILE_SIZE / 1024 / 1024}MB each. Accepted formats: JPG, PNG, GIF, WebP
              </p>

              {/* Screenshot errors */}
              {screenshotErrors.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <ul className="list-disc list-inside space-y-1">
                    {screenshotErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Screenshot preview */}
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {screenshots.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-video bg-muted rounded-md overflow-hidden border">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 border border-green-500/20 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{success}</p>
                  {ticketId && (
                    <p className="text-xs mt-1">Ticket ID: <strong>{ticketId}</strong></p>
                  )}
                  <p className="text-xs mt-1">You will receive a confirmation email shortly.</p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Ticket"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
