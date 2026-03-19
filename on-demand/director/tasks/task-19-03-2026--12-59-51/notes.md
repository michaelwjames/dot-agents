# Notes - Sets 1 & 2 Implementation

## Set 1: Copy Button
- Icon: `Copy`, `Check` from `lucide-react`.
- Position: bottom-right of assistant message bubble.
- Action: `navigator.clipboard.writeText(message.content)`.
- Feedback: Toggle icon for 2 seconds.

## Set 2: Token Usage Tooltip
- Backend needs to return `tokenStats` in `POST /api/message`.
- `TokenTracker` already has `calculateContextStats` and `getRateLimitStats`.
- Combined `tokenStats` object needed.
- Frontend needs a popover/tooltip.

## Implementation details for TokenStats
The spec asks for:
- `inputTokens` -> `currentContextTokens`
- `outputTokens` -> `estimatedResponseTokens`
- `model` -> `model` from `RateLimitStats`
- `systemPromptTokens`
- `historyTokens`
- `userMessageTokens`
- `toolDefinitionTokens`
- `percentOfContextWindow`
- `tpmUsed` -> `percentOfTPM`
- `tpdUsed` -> `percentOfTPD`
