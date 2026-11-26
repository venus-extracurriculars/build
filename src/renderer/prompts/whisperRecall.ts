import type { StructuredRequest } from '@vx/modkit/shared'
import { whisperRecall, type VenusWhisper } from '../../shared/venusWhisper'

/** Existing request hooks supply the actual scene action or incoming DM as the recall query. */
export function withWhisperRecall(request: StructuredRequest, state: VenusWhisper, term: number, day: number, cast: readonly string[], query: string): StructuredRequest {
  const lines = whisperRecall(state, term, day, cast, query)
  if (!lines.length) return request
  const context = lines.join('\n') + '\n\n'
  return { ...request, user: context + request.user,
    ...(request.logFrom !== undefined ? { logFrom: request.logFrom + context.length } : {}) }
}
