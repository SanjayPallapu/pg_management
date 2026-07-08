import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calculator, History, Delete, Trash2, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface CalculationHistory {
  expression: string;
  result: string;
  timestamp: Date;
}

interface CalculatorCardProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideCard?: boolean;
  defaultOpen?: boolean;
}

export const CalculatorCard = ({ externalOpen, onExternalOpenChange, hideCard, defaultOpen = false }: CalculatorCardProps = {}) => {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const sheetOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setSheetOpen = (open: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calculator-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      } catch (e) {
        console.error('Failed to load calculator history');
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: CalculationHistory[]) => {
    setHistory(newHistory);
    localStorage.setItem('calculator-history', JSON.stringify(newHistory));
  }, []);

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
    setExpression(expression + num);
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    setExpression(expression + ' ' + op + ' ');
    setDisplay(op);
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
    if (expression.length > 0) {
      setExpression(expression.slice(0, -1));
    }
  };

  // Safe mathematical expression evaluator - no eval()
  const safeEvaluate = (expr: string): number => {
    // Replace × with * and ÷ with /
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').trim();
    
    // Strict validation: only allow digits, operators, parentheses, decimal points, and spaces
    if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
      throw new Error('Invalid characters in expression');
    }
    
    // Tokenize the expression
    const tokens: (number | string)[] = [];
    let i = 0;
    while (i < sanitized.length) {
      if (sanitized[i] === ' ') {
        i++;
        continue;
      }
      
      // Parse numbers (including decimals)
      if (/[0-9.]/.test(sanitized[i])) {
        let numStr = '';
        while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
          numStr += sanitized[i];
          i++;
        }
        const num = parseFloat(numStr);
        if (isNaN(num)) throw new Error('Invalid number');
        tokens.push(num);
      } else if (['+', '-', '*', '/', '(', ')'].includes(sanitized[i])) {
        tokens.push(sanitized[i]);
        i++;
      } else {
        throw new Error('Invalid character');
      }
    }
    
    // Simple recursive descent parser
    let pos = 0;
    
    const parseExpression = (): number => {
      let result = parseTerm();
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        const op = tokens[pos++];
        const right = parseTerm();
        result = op === '+' ? result + right : result - right;
      }
      return result;
    };
    
    const parseTerm = (): number => {
      let result = parseFactor();
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        const op = tokens[pos++];
        const right = parseFactor();
        if (op === '/' && right === 0) throw new Error('Division by zero');
        result = op === '*' ? result * right : result / right;
      }
      return result;
    };
    
    const parseFactor = (): number => {
      // Handle unary minus
      if (tokens[pos] === '-') {
        pos++;
        return -parseFactor();
      }
      
      if (tokens[pos] === '(') {
        pos++; // consume '('
        const result = parseExpression();
        if (tokens[pos] !== ')') throw new Error('Mismatched parentheses');
        pos++; // consume ')'
        return result;
      }
      
      if (typeof tokens[pos] === 'number') {
        return tokens[pos++] as number;
      }
      
      throw new Error('Unexpected token');
    };
    
    const result = parseExpression();
    if (pos !== tokens.length) throw new Error('Invalid expression');
    return result;
  };

  const handleEquals = () => {
    try {
      const result = safeEvaluate(expression);
      const formattedResult = Number.isFinite(result) 
        ? parseFloat(result.toFixed(8)).toString() 
        : 'Error';
      
      setDisplay(formattedResult);
      
      if (formattedResult !== 'Error') {
        const newEntry: CalculationHistory = {
          expression: expression,
          result: formattedResult,
          timestamp: new Date(),
        };
        saveHistory([newEntry, ...history].slice(0, 50)); // Keep last 50
      }
      
      setExpression(formattedResult);
    } catch (e) {
      setDisplay('Error');
      setExpression('');
    }
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
      setExpression(expression + '.');
    }
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  const buttons = [
    ['C', '⌫', '÷', '×'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '.', '', ''],
  ];

  const handleButtonClick = (btn: string) => {
    switch (btn) {
      case 'C':
        handleClear();
        break;
      case '⌫':
        handleBackspace();
        break;
      case '=':
        handleEquals();
        break;
      case '.':
        handleDecimal();
        break;
      case '+':
      case '-':
      case '×':
      case '÷':
        handleOperator(btn);
        break;
      default:
        if (btn) handleNumber(btn);
    }
  };

  const getButtonClass = (btn: string) => {
    if (btn === 'C') return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    if (btn === '⌫') return 'bg-muted hover:bg-muted/80';
    if (btn === '=') return 'bg-primary text-primary-foreground hover:bg-primary/90 row-span-2';
    if (['+', '-', '×', '÷'].includes(btn)) return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
    return 'bg-background hover:bg-accent';
  };

  return (
    <>
      {!hideCard && (
        <Card 
          className="cursor-pointer transition-all hover:shadow-md border-primary/20 bg-card hover:bg-muted/30"
          onClick={() => setSheetOpen(true)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-sm">Calculator</span>
                <span className="text-xs text-muted-foreground">
                  {history.length > 0 
                    ? `Last: ${history[0].expression} = ${history[0].result}` 
                    : 'Simple calculator for monthly dues calculations'}
                </span>
              </div>
            </div>
            <span className="text-xs text-primary font-medium shrink-0">Open →</span>
          </CardContent>
        </Card>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSheetOpen(false)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <SheetTitle className="text-base text-foreground font-bold text-left">Calculator</SheetTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-1.5 py-4 bg-background">
              {showHistory ? (
                <div className="px-2.5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">History</h3>
                    {history.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearHistory} className="h-8 text-xs">
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  {history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No calculations yet</p>
                  ) : (
                    <div className="space-y-2 pb-12">
                      {history.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/30 text-left">
                          <div className="text-xs text-muted-foreground font-mono">{item.expression}</div>
                          <div className="text-lg font-bold font-mono text-foreground">= {item.result}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {item.timestamp.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2.5 space-y-4 pb-12">
                  {/* Display */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-right">
                    <div className="text-xs text-muted-foreground font-mono truncate">{expression || '0'}</div>
                    <div className="text-2xl font-bold font-mono truncate text-foreground">{display}</div>
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {buttons.flat().map((btn, idx) => {
                      if (!btn) return <div key={idx} />;
                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          className={`h-14 text-lg font-medium border-border/30 ${getButtonClass(btn)}`}
                          onClick={() => handleButtonClick(btn)}
                        >
                          {btn === '⌫' ? <Delete className="h-5 w-5" /> : btn}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
