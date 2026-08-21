import { caseCoreSchema, type CaseCore } from '../core/investigation-schema';

export function validateCaseCore(candidate: unknown): CaseCore {
  const parsed = caseCoreSchema.parse(candidate);
  const assertUnique = (ids: string[], label: string) => {
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} id`);
  };
  assertUnique(parsed.facts.map((fact) => fact.factId), 'fact');
  assertUnique(parsed.sources.map((source) => source.sourceId), 'source');
  assertUnique(parsed.grammar.methods.map((method) => method.methodId), 'method');
  const factIds = new Set(parsed.facts.map((fact) => fact.factId));
  const sourceIds = new Set(parsed.sources.map((source) => source.sourceId));
  const endingIds = new Set(parsed.endings.map((ending) => ending.endingId));
  if (endingIds.size !== parsed.endings.length) throw new Error('Duplicate ending id');
  for (const source of parsed.sources) {
    if (source.factIds.some((id) => !factIds.has(id)) || source.recoverySourceIds.some((id) => !sourceIds.has(id))) throw new Error('Dangling clue source reference');
  }
  for (const ending of parsed.endings) {
    if (ending.requiredFactIds.length === 0) throw new Error(`Ending ${ending.endingId} has no prerequisite facts`);
    if (ending.requiredFactIds.some((id) => !factIds.has(id))) throw new Error('Dangling ending fact reference');
  }
  for (const fact of parsed.facts) {
    const sources = parsed.sources.filter((source) => source.factIds.includes(fact.factId));
    if (sources.length < 2) throw new Error(`Fact ${fact.factId} needs two sources`);
  }
  const methodIds = new Set(parsed.grammar.methods.map((method) => method.methodId));
  for (const method of parsed.grammar.methods) if (method.sourceIds.some((id) => !sourceIds.has(id))) throw new Error('Dangling method source reference');
  for (const lens of parsed.occupationLenses) if (lens.preferredMethodIds.some((id) => !methodIds.has(id)) || lens.allowedSourceIds.some((id) => !sourceIds.has(id))) throw new Error('Dangling occupation lens reference');
  for (const lens of parsed.pathwayLenses) if (lens.methodModifiers && Object.keys(lens.methodModifiers).some((id) => !methodIds.has(id))) throw new Error('Dangling pathway lens reference');
  return parsed;
}
