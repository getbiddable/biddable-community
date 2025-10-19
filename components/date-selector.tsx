"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface DateSelectorProps {
  label: string
  value: string
  onChange: (date: string) => void
  placeholder?: string
  required?: boolean
  minDate?: string
  maxDate?: string
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function DateSelector({
  label,
  value,
  onChange,
  placeholder = "Select date",
  required = false,
  minDate,
  maxDate,
}: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize current month/year based on selected value
  useEffect(() => {
    if (value) {
      const selectedDate = new Date(value)
      setCurrentMonth(selectedDate.getMonth())
      setCurrentYear(selectedDate.getFullYear())
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const parseDate = (dateString: string) => {
    return dateString ? new Date(dateString + "T00:00:00") : null
  }

  const isDateDisabled = (date: Date) => {
    const dateString = formatDate(date)
    if (minDate && dateString < minDate) return true
    if (maxDate && dateString > maxDate) return true
    return false
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day)
    if (!isDateDisabled(selectedDate)) {
      onChange(formatDate(selectedDate))
      setIsOpen(false)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const selectedDate = parseDate(value)

    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear
      const isDisabled = isDateDisabled(date)
      const isToday = new Date().toDateString() === date.toDateString()

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          disabled={isDisabled}
          className={`
            w-8 h-8 text-sm flex items-center justify-center transition-colors
            ${
              isSelected
                ? "bg-primary text-white"
                : isToday
                  ? "bg-accent text-accent-foreground border border-primary"
                  : "text-foreground hover:bg-muted"
            }
            ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {day}
        </button>,
      )
    }

    return days
  }

  const displayValue = value ? parseDate(value)?.toLocaleDateString() : ""

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <Label className="text-foreground">
        {label}
        {required && <span className="text-primary ml-1">*</span>}
      </Label>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between bg-background border-border text-foreground hover:bg-muted"
        >
          <span className={displayValue ? "text-foreground" : "text-muted-foreground"}>
            {displayValue || placeholder}
          </span>
          <Calendar className="h-4 w-4" />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-card border border-border shadow-lg z-50 p-4 min-w-[280px]">
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("prev")}
                className="text-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-foreground font-medium">
                {months[currentMonth]} {currentYear}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("next")}
                className="text-foreground hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="w-8 h-8 text-xs text-muted-foreground flex items-center justify-center font-medium"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
          </div>
        )}
      </div>
    </div>
  )
}
