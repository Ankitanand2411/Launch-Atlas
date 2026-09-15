/**
 * Provisional caption tagging by regex. Phase 2 replaces this with LLM extraction over
 * full text + transcript; these flags exist so H4/H6 can be tested from day one.
 */
export interface CaptionFlags {
  funding: boolean;      // raised / Series X / backed by / $NNM
  traction: boolean;     // ARR, valuation, customers, calls handled, revenue
  product: boolean;      // introducing / launching / new model or feature
  story: boolean;        // founder narrative markers
  stunt: boolean;        // challenge / prize / dare
  firstLine: string;
  firstLineHasNumber: boolean;
  firstLineIsDare: boolean;
  hooks: number;
}

const MONEY = /\$\s?\d[\d,.]*\s?(?:k|m|b|mm|bn|million|billion)\b/i;

export function tagCaption(text: string): CaptionFlags {
  const t = text ?? "";
  const firstLine = t.split(/\n+/).map((s) => s.trim()).find(Boolean) ?? "";
  const funding = /\braised\b|\bseries [a-f]\b|\bbacked by\b|\bfrom (?:[A-Z][\w&.' ]+(?:,| and)\s?)+/.test(t) || MONEY.test(t);
  const traction = /\bARR\b|\bvaluation\b|\brevenue\b|\bcustomers\b|\bcalls\b|\bdeployments\b|\bper employee\b|\bprofitabl/i.test(t);
  const product = /\bintroduc|\blaunch|\bannounc|\bnew (?:model|app|feature)|\bnow available|\bdownload now/i.test(t);
  const story = /never (?:shared|told)|the story|journey|embarrassing|could(?:'|’)ve died|younger self/i.test(t);
  const stunt = /\bif (?:they|you) (?:could|can)\b|\bchallenge\b|\bgiveaway\b|\bwin a\b|\bPorsche\b/i.test(t);
  const firstLineHasNumber = /\d/.test(firstLine);
  const firstLineIsDare = /\bif (?:they|you) (?:could|can)\b|\bchallenge\b/i.test(firstLine);
  const hooks = [funding, traction, product, story, stunt].filter(Boolean).length;
  return { funding, traction, product, story, stunt, firstLine, firstLineHasNumber, firstLineIsDare, hooks };
}
