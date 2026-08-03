const tokenize = (expression: string) => {
  const compact = expression.replace(/\s/g, "");
  if (!compact || !/^[0-9+\-*/.]+$/.test(compact)) return null;
  return compact.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/]/g);
};

export const evaluateAmountExpression = (expression: string): number | null => {
  const tokens = tokenize(expression);
  if (!tokens || tokens.join("") !== expression.replace(/\s/g, "")) return null;
  let position = 0;

  const number = (): number | null => {
    const token = tokens[position];
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return null;
    position += 1;
    const parsed = Number(token);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const product = (): number | null => {
    let value = number();
    if (value === null) return null;
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const right = number();
      if (right === null || (operator === "/" && right === 0)) return null;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  let value = product();
  if (value === null) return null;
  while (tokens[position] === "+" || tokens[position] === "-") {
    const operator = tokens[position++];
    const right = product();
    if (right === null) return null;
    value = operator === "+" ? value + right : value - right;
  }
  if (position !== tokens.length || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

export const safeEvaluateExpression = (expression: string): string => {
  if (!expression.trim()) return "0";
  const cleanExpr = expression.trim().replace(/[+\-*/.]+$/, "");
  if (!cleanExpr) return "0";
  const result = evaluateAmountExpression(cleanExpr);
  return result === null ? "Error" : String(result);
};

