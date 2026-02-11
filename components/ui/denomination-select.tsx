"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DENOMINATIONS } from "@/lib/denominations";

interface DenominationSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const OPTIONS = DENOMINATIONS.filter((d) => d !== "Other");

export function DenominationSelect({
  value,
  onValueChange,
  id,
  className,
  disabled,
}: DenominationSelectProps) {
  const [open, setOpen] = React.useState(false);

  const displayValue = value || "Select denomination";

  const handleSelect = (selected: string) => {
    onValueChange(selected);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search denominations..." />
          <CommandList>
            <CommandEmpty>No denomination found.</CommandEmpty>
            <CommandGroup>
              {OPTIONS.map((denom) => (
                <CommandItem
                  key={denom}
                  value={denom}
                  onSelect={() => handleSelect(denom)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === denom ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {denom}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem
                value="Other"
                onSelect={() => handleSelect("Other")}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === "Other" ? "opacity-100" : "opacity-0"
                  )}
                />
                Other
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
