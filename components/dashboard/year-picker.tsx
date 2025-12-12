"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useYear } from "@/contexts/year-context"

export function YearPicker() {
  const { selectedYear, setSelectedYear, currentYear } = useYear()
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Calculate the starting year for the current 9-year range
  // We'll show years centered around the selected year
  const getStartYear = (year: number) => {
    const remainder = year % 9
    return year - remainder
  }

  const [startYear, setStartYear] = useState(() => getStartYear(selectedYear))

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update start year when selected year changes
  useEffect(() => {
    setStartYear(getStartYear(selectedYear))
  }, [selectedYear])

  const years = Array.from({ length: 9 }, (_, i) => startYear + i)

  const handlePrevious = () => {
    setStartYear(prev => prev - 9)
  }

  const handleNext = () => {
    setStartYear(prev => prev + 9)
  }

  const handleYearClick = (year: number) => {
    setSelectedYear(year)
    // Update the range to center around the selected year
    setStartYear(getStartYear(year))
  }

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Year:</span>
        <div className="relative">
          <Button variant="ghost" size="sm" className="h-8 px-2 font-medium" disabled>
            {currentYear}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Year:</span>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 font-medium"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedYear}
        </Button>

        {/* Year Picker Dropdown */}
        {isOpen && (
          <div className="absolute top-full mt-1 bg-popover border border-border rounded-md shadow-md p-3 z-50 min-w-[280px]">
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {startYear} - {startYear + 8}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Year Grid */}
            <div className="grid grid-cols-3 gap-1">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={year === selectedYear ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleYearClick(year)}
                  className={cn(
                    "h-10 text-sm font-medium",
                    year === currentYear && year !== selectedYear && "ring-1 ring-primary/50"
                  )}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
