/**
 * Extract valid JSON from text that might contain markdown or other formatting
 * @param text The text that might contain JSON
 * @returns Cleaned JSON string
 */
export function extractJsonFromText(text: string): string {
  // Remove markdown code block markers if present
  let cleanedText = text.replace(/```json\s*|\s*```/g, "");

  // Find JSON object in the text
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  return cleanedText;
}

/**
 * Estimate token count for a string
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Simple estimation based on character count and word count
  const charCount = text.length;
  const wordCount = text.split(/\s+/).length;

  return Math.ceil(
    (charCount * 0.25 + wordCount * 1.3) / 2
  );
}