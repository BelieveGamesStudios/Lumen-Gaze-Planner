"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface YearContextType {
  selectedYear: number
  setSelectedYear: (year: number) => void
  currentYear: number
}

const YearContext = createContext<YearContextType | undefined>(undefined)

export function YearProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()

  // Get initial year from URL or default to current year
  const yearParam = searchParams.get("year")
  const initialYear = yearParam && !Number.isNaN(parseInt(yearParam, 10))
    ? parseInt(yearParam, 10)
    : currentYear

  const [selectedYear, setSelectedYearState] = useState(initialYear)

  // Update selected year when URL changes
  useEffect(() => {
    const yearParam = searchParams.get("year")
    const urlYear = yearParam && !Number.isNaN(parseInt(yearParam, 10))
      ? parseInt(yearParam, 10)
      : currentYear

    if (urlYear !== selectedYear) {
      setSelectedYearState(urlYear)
    }
  }, [searchParams, currentYear, selectedYear])

  const setSelectedYear = (year: number) => {
    setSelectedYearState(year)

    // Update URL to reflect the new year
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", String(year))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, currentYear }}>
      {children}
    </YearContext.Provider>
  )
}

export function useYear() {
  const context = useContext(YearContext)
  if (context === undefined) {
    throw new Error("useYear must be used within a YearProvider")
  }
  return context
}
