"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getCurrentWeek } from '@/lib/utils/date'
import { useSearchParams } from 'next/navigation'

interface YearContextType {
  selectedYear: number
  setSelectedYear: (year: number) => void
  currentYear: number
}

const YearContext = createContext<YearContextType | undefined>(undefined)

export function useYear() {
  const context = useContext(YearContext)
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider')
  }
  return context
}

interface YearProviderProps {
  children: ReactNode
}

export function YearProvider({ children }: YearProviderProps) {
  const { year: actualCurrentYear } = getCurrentWeek()
  const [currentYear] = useState(actualCurrentYear)

  // Initialize selected year from localStorage or current year
  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedYear')
      return stored ? parseInt(stored, 10) : currentYear
    }
    return currentYear
  })

  // Update localStorage and URL when selected year changes
  const setSelectedYear = (year: number) => {
    setSelectedYearState(year)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedYear', year.toString())

      // Update URL without triggering a page reload
      const url = new URL(window.location.href)
      url.searchParams.set('year', year.toString())
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Sync with URL params on mount (for direct navigation/bookmarks)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const yearFromUrl = urlParams.get('year')
      if (yearFromUrl && !isNaN(parseInt(yearFromUrl, 10))) {
        const year = parseInt(yearFromUrl, 10)
        setSelectedYearState(year)
        localStorage.setItem('selectedYear', year.toString())
      }
    }
  }, [])

  const value = {
    selectedYear,
    setSelectedYear,
    currentYear,
  }

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  )
}
