import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, MessageCircle, Phone, ChevronDown, Receipt } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { BuildingRentReceiptDialog } from './BuildingRentReceiptDialog';
import { formatIndianCurrency } from '@/utils/numberToWords';

const WHATSAPP_NUMBER = '9989568666';
const BUILDING_RENT = 150000;

export const BuildingRentCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const forMonth = `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  const handleCall = () => {
    window.location.href = `tel:+91${WHATSAPP_NUMBER}`;
  };

  const handleChat = () => {
    window.open(`https://wa.me/91${WHATSAPP_NUMBER}`, '_blank');
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm">Building Rent</span>
            </div>
            
            {/* Chat badge dropdown */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800"
                onClick={handleCall}
              >
                <Phone className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReceiptDialogOpen(true)}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Generate Receipt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleChat}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Owner
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Amount */}
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              ₹{formatIndianCurrency(BUILDING_RENT)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Monthly Rent</p>
          </div>

          {/* Month indicator */}
          <div className="text-center mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
            <p className="text-sm text-muted-foreground">
              For: <span className="font-medium text-foreground">{forMonth}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <BuildingRentReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        forMonth={forMonth}
      />
    </>
  );
};
