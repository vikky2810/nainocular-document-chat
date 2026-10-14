import OpenAI from 'openai'

// Turns OpenRouter errors into messages a user can act on
export function aiErrorMessage(err: InstanceType<typeof OpenAI.APIError>, action: string) {
  if (err.status === 429) {
    return /per-day/i.test(err.message)
      ? "Today's free AI quota on OpenRouter is used up. Try again tomorrow, or add credits to the OpenRouter account."
      : `The free AI tier is rate-limited right now. Wait a minute and ${action}.`
  }
  if (err.status === 401) return 'The OpenRouter API key is missing or invalid. Check OPENROUTER_API_KEY.'
  return `The AI service failed (${err.status ?? 'network error'}). Please ${action}.`
}
