import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { getSamplesForLab } from '@/lib/db/samples';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AI_TIMEOUT = 8000;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const chatInputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

async function callGemini(messages: { role: string; content: string }[], systemPrompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[POST /api/ai/chat] Gemini API error:', response.status, errText.slice(0, 500));
      return null;
    }

    const resJson = await response.json();
    const aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      console.error('[POST /api/ai/chat] Gemini empty response:', JSON.stringify(resJson).slice(0, 500));
      return null;
    }

    return aiText;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error('[POST /api/ai/chat] Gemini timed out');
    } else {
      console.error('[POST /api/ai/chat] Gemini error:', err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(messages: { role: string; content: string }[], systemPrompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[POST /api/ai/chat] OpenAI API error:', response.status, errText.slice(0, 500));
      return null;
    }

    const resJson = await response.json();
    const aiText = resJson?.choices?.[0]?.message?.content;
    if (!aiText) {
      console.error('[POST /api/ai/chat] OpenAI empty response:', JSON.stringify(resJson).slice(0, 500));
      return null;
    }

    return aiText;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error('[POST /api/ai/chat] OpenAI timed out');
    } else {
      console.error('[POST /api/ai/chat] OpenAI error:', err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, labId: true, role: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = chatInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { messages } = parsed.data;

    const samples = await getSamplesForLab(dbUser.labId, 10);
    const samplesContext = samples.map((s) => ({
      id: s.humanId,
      type: s.sampleType,
      source: s.source,
      phase: s.currentPhase || 'Not Started',
      exp: s.experimentType || 'None',
    }));

    const systemPrompt = `You are a lab assistant. Answer in 1-2 plain sentences. Use periods only. Never use asterisks, dashes, bullets, markdown, or lists. Translate medical terms into simple words.

You have access to these samples in this lab:
${JSON.stringify(samplesContext)}

Do not give medical advice or make up samples. Only refer to samples in the provided list. If a request is unrelated to lab work, say: "I can only help explain medical terms, lab samples, and lab workflows."`;

    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!hasGemini && !hasOpenAI) {
      return NextResponse.json(
        { error: 'AI features are not configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your env configuration.' },
        { status: 400 }
      );
    }

    let aiText: string | null = null;

    if (hasGemini && hasOpenAI) {
      aiText = await Promise.race([
        callGemini(messages, systemPrompt),
        callOpenAI(messages, systemPrompt),
      ]);
    } else if (hasGemini) {
      aiText = await callGemini(messages, systemPrompt);
    } else {
      aiText = await callOpenAI(messages, systemPrompt);
    }

    if (!aiText) {
      return NextResponse.json(
        { error: 'Service not available' },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: aiText }, { status: 200 });

  } catch (error) {
    console.error('[POST /api/ai/chat]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
