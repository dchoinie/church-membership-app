"use client"

import * as React from "react"
import { format } from "date-fns"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Service {
  id: string
  serviceDate: string
  serviceType: string
  serviceTime: string | null
}

interface ServiceSelectorProps {
  value: string | null // serviceId or null for "Other"
  onValueChange: (value: string | null) => void
  services: Service[]
  className?: string
  disabled?: boolean
}

const formatServiceType = (type: string): string => {
  const typeMap: Record<string, string> = {
    divine_service: "Divine Service",
    midweek_lent: "Midweek Lent",
    midweek_advent: "Midweek Advent",
    festival: "Festival",
  }
  return typeMap[type] || type
}

const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return ""
  try {
    const [hours, minutes] = timeString.split(":")
    const hour = parseInt(hours, 10)
    const minute = parseInt(minutes, 10)
    const today = new Date()
    const serviceDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute)
    return format(serviceDateTime, "h:mm a")
  } catch {
    return timeString
  }
}

const formatServiceDisplay = (service: Service): string => {
  const dateStr = format(new Date(service.serviceDate), "MMM d, yyyy")
  const timeStr = service.serviceTime ? ` ${formatTime(service.serviceTime)}` : ""
  return `${dateStr}${timeStr} - ${formatServiceType(service.serviceType)}`
}

export function ServiceSelector({
  value,
  onValueChange,
  services,
  className,
  disabled,
}: ServiceSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Get selected service or null for "Other"
  const selectedService = value ? services.find((s) => s.id === value) : null

  // Filter services based on search query
  const filteredServices = React.useMemo(() => {
    if (!searchQuery) return services

    const query = searchQuery.toLowerCase()
    return services.filter((service) => {
      const dateStr = format(new Date(service.serviceDate), "MMM d, yyyy").toLowerCase()
      const timeStr = service.serviceTime ? formatTime(service.serviceTime).toLowerCase() : ""
      const typeStr = formatServiceType(service.serviceType).toLowerCase()
      const displayStr = formatServiceDisplay(service).toLowerCase()

      return (
        dateStr.includes(query) ||
        timeStr.includes(query) ||
        typeStr.includes(query) ||
        displayStr.includes(query)
      )
    })
  }, [services, searchQuery])

  // Group services by month
  const groupedServices = React.useMemo(() => {
    const groups: Record<string, Service[]> = {}
    
    filteredServices.forEach((service) => {
      const date = new Date(service.serviceDate)
      const monthKey = format(date, "MMMM yyyy")
      
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(service)
    })

    // Sort groups by date (newest first)
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].serviceDate)
      const dateB = new Date(b[1][0].serviceDate)
      return dateB.getTime() - dateA.getTime()
    })

    // Sort services within each group by date and time (newest first)
    sortedGroups.forEach(([_, services]) => {
      services.sort((a, b) => {
        const dateA = new Date(a.serviceDate)
        const dateB = new Date(b.serviceDate)
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime()
        }
        // If same date, sort by time
        if (a.serviceTime && b.serviceTime) {
          return b.serviceTime.localeCompare(a.serviceTime)
        }
        return 0
      })
    })

    return sortedGroups
  }, [filteredServices])

  // Show last 6 months by default, or all if searching
  const sixMonthsAgo = React.useMemo(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 6)
    return date
  }, [])

  const displayGroups = React.useMemo(() => {
    if (searchQuery) {
      // Show all groups when searching
      return groupedServices
    }
    // Show only last 6 months by default
    return groupedServices.filter(([_, services]) => {
      const serviceDate = new Date(services[0].serviceDate)
      return serviceDate >= sixMonthsAgo
    })
  }, [groupedServices, searchQuery, sixMonthsAgo])

  const hasMoreServices = React.useMemo(() => {
    if (searchQuery) return false
    return groupedServices.length > displayGroups.length
  }, [groupedServices, displayGroups, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedService ? formatServiceDisplay(selectedService) : value === null ? "Other" : "Select service..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by date, time, or service type..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No services found.</CommandEmpty>
            {/* "Other" option always at top */}
            <CommandGroup>
              <CommandItem
                value="other"
                onSelect={() => {
                  onValueChange(null)
                  setOpen(false)
                  setSearchQuery("")
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
                Other (not at a service)
              </CommandItem>
            </CommandGroup>
            {/* Service groups */}
            {displayGroups.map(([month, monthServices]) => (
              <CommandGroup key={month} heading={month}>
                {monthServices.map((service) => (
                  <CommandItem
                    key={service.id}
                    value={service.id}
                    onSelect={() => {
                      onValueChange(service.id)
                      setOpen(false)
                      setSearchQuery("")
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === service.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {formatServiceDisplay(service)}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {hasMoreServices && (
              <CommandGroup>
                <CommandItem
                  disabled
                  className="text-xs text-muted-foreground italic"
                >
                  {groupedServices.length - displayGroups.length} more month(s) available. Use search to find older services.
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
