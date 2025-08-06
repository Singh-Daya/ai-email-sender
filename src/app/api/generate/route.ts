import { NextRequest, NextResponse } from 'next/server';

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GroqChoice = {
  index: number;
  message: ChatMessage;
  finish_reason?: string;
};

type GroqResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqChoice[];
};

type GenerateBody = {
  prompt: string;
};

/**
 * POST /api/generate
 * Body: { prompt: string }
 */
export async function POST(req: NextRequest) {
  try {
    // 1) Parse body safely and type it
    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return jsonError('Request body must be JSON with { prompt: string }', 400);
    }

    const { prompt } = (bodyJson ?? {}) as Partial<GenerateBody>;
    if (!prompt || typeof prompt !== 'string') {
      return jsonError('Invalid prompt. Please provide a valid string.', 400);
    }

    // 2) Check key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return jsonError('Server configuration error: Missing GROQ_API_KEY', 500);
    }

    // 3) Call Groq with defensive handling + timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content:
                'You write concise, professional emails. Start with "Subject: [subject]" on the first line, followed by the email body.',
            },
            { role: 'user', content: prompt },
          ] satisfies ChatMessage[],
          temperature: 0.7,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        return jsonError(`AI service error (${resp.status}): ${txt || 'No response body'}`, resp.status);
      }

      // 4) Parse Groq JSON safely and type-check shape
      let dataUnknown: unknown;
      try {
        dataUnknown = await resp.json();
      } catch {
        return jsonError('Invalid response from AI service', 502);
      }

      const data = dataUnknown as Partial<GroqResponse>;
      const content =
        data?.choices?.[0]?.message?.content && typeof data.choices[0].message.content === 'string'
          ? data.choices[0].message.content
          : '';

      if (!content.trim()) {
        return jsonError('AI service returned empty content', 502);
      }

      // 5) Split Subject + Body
      let subject = 'Your AI-generated email';
      let emailBody = content.trim();

      const subjectMatch = emailBody.match(/^Subject:\s*(.+)$/im);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        emailBody = emailBody.replace(/^Subject:\s*.+$/im, '').trim();
      }

      return NextResponse.json({ subject, body: emailBody });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return jsonError('AI service timed out. Please try again.', 504);
      }
      // Re-throw to outer catch for consistent error JSON
      throw error;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonError(`Server error: ${message}`, 500);
  }
}
