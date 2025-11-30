const jsonata = require('jsonata');

/**
 * Evaluates a JSONata expression with the given context
 * @param expression JSONata expression string
 * @param context Context object with variables accessible in the expression
 * @returns The evaluated result
 */
export async function evaluateFeel(expression: string, context: any): Promise<any> {
  if (!expression || !expression.trim()) {
    return context;
  }

  try {
    const expr = jsonata(expression);
    const result = await expr.evaluate(context);
    return result;
  } catch (error: any) {
    throw new Error(`JSONata evaluation error: ${error.message || String(error)}`);
  }
}

/**
 * Evaluates a JSONata expression that should return a JSON object
 * Used for input/output transformation
 * @param expression JSONata expression string
 * @param context Context object with variables accessible in the expression
 * @returns The evaluated result (should be a JSON object)
 */
export async function evaluateFeelExpression(expression: string, context: any): Promise<any> {
  if (!expression || !expression.trim()) {
    return null; // Return null to indicate no transformation
  }

  try {
    const result = await evaluateFeel(expression, context);
    
    // Ensure result is a valid JSON object
    if (result === null || result === undefined) {
      return null;
    }
    
    // If result is already an object, return it
    if (typeof result === 'object' && !Array.isArray(result)) {
      return result;
    }
    
    // If result is a primitive, wrap it in an object
    return { value: result };
  } catch (error: any) {
    throw new Error(`JSONata expression evaluation error: ${error.message || String(error)}`);
  }
}
