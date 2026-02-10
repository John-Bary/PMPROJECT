import * as React from "react"
import { DayPicker, DayFlag, SelectionState, UI } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "lib/utils"
import { buttonVariants } from "components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        [UI.Months]: "relative flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        [UI.Month]: "space-y-4",
        [UI.MonthCaption]: "flex justify-center pt-1 relative items-center h-7",
        [UI.CaptionLabel]: "text-sm font-medium",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-1 top-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-1 top-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        [UI.MonthGrid]: "w-full border-collapse space-y-1",
        [UI.Weekdays]: "flex",
        [UI.Weekday]: "text-neutral-500 rounded-md w-8 font-normal text-[0.8rem]",
        [UI.Week]: "flex w-full mt-2",
        [UI.Day]: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-neutral-100 [&:has([aria-selected].day-outside)]:bg-neutral-100/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
        ),
        [SelectionState.range_start]: "day-range-start",
        [SelectionState.range_end]: "day-range-end",
        [SelectionState.selected]:
          "bg-primary-600 text-white hover:bg-primary-600 hover:text-white focus:bg-primary-600 focus:text-white",
        [SelectionState.range_middle]:
          "aria-selected:bg-neutral-100 aria-selected:text-neutral-900",
        [DayFlag.today]: "bg-neutral-100 text-neutral-900",
        [DayFlag.outside]:
          "day-outside text-neutral-400 aria-selected:bg-neutral-100/50 aria-selected:text-neutral-400",
        [DayFlag.disabled]: "text-neutral-400 opacity-50",
        [DayFlag.hidden]: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft className="h-4 w-4" />
          return <ChevronRight className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
