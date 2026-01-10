import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calculator, History, Delete, Trash2 } from 'lucide-react';

interface CalculationHistory {
  expression: string;
  result: string;
  timestamp: Date;
}

export const CalculatorCard = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
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
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium">Calculator</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold font-mono">
            {history.length > 0 ? history[0].result : '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            {history.length > 0 
              ? `Last: ${history[0].expression}` 
              : 'Tap to open calculator'}
          </p>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Calculator</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {showHistory ? (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">History</h3>
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[calc(80vh-150px)]">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No calculations yet</p>
                ) : (
                  <div className="space-y-2 pr-4">
                    {history.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                        <div className="text-sm text-muted-foreground font-mono">{item.expression}</div>
                        <div className="text-xl font-bold font-mono">= {item.result}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.timestamp.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Display */}
              <div className="p-4 rounded-lg bg-muted/50 border text-right">
                <div className="text-sm text-muted-foreground font-mono truncate">{expression || '0'}</div>
                <div className="text-3xl font-bold font-mono truncate">{display}</div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {buttons.flat().map((btn, idx) => {
                  if (!btn) return <div key={idx} />;
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      className={`h-14 text-xl font-medium ${getButtonClass(btn)}`}
                      onClick={() => handleButtonClick(btn)}
                    >
                      {btn === '⌫' ? <Delete className="h-5 w-5" /> : btn}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
