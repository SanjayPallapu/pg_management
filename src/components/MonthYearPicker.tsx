import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMonthContext } from '@/contexts/MonthContext';

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const MonthYearPicker = () => {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonthContext();
  const currentDate = new Date();
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const monthLabel = months.find(m => m.value === selectedMonth)?.label?.slice(0, 3) || '';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-1.5 px-2 h-10">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium">{monthLabel} {selectedYear}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Select Month & Year</div>
          <div className="flex gap-2">
            <Select value={selectedMonth.toString()} onValueChange={value => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={value => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
