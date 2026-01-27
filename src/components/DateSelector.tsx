import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export const DateSelector = ({ date, onDateChange, className }: DateSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrevDay = () => {
    onDateChange(subDays(date, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(date, 1));
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange(selectedDate);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 hover:bg-amber-500/20"
        onClick={handlePrevDay}
      >
        <ChevronLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-6 px-2 text-sm text-muted-foreground hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300"
          >
            {format(date, "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 hover:bg-amber-500/20"
        onClick={handleNextDay}
      >
        <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </Button>
    </div>
  );
};
