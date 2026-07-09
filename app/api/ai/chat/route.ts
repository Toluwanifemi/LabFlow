import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { getSamplesForLab } from '@/lib/db/samples';

async function callGemini(messages: { role: string; content: string }[], systemPrompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
}

async function callOpenAI(messages: { role: string; content: string }[], systemPrompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
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
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages history is required.' }, { status: 400 });
    }

    const samples = await getSamplesForLab(dbUser.labId, 50);
    const samplesContext = samples.map((s) => ({
      displayId: s.humanId,
      type: s.sampleType,
      source: s.source,
      phase: s.currentPhase || 'Not Started',
      experiment: s.experimentType || 'None',
      date: s.collectionDate instanceof Date
        ? s.collectionDate.toISOString().split('T')[0]
        : String(s.collectionDate).split('T')[0],
    }));

    const systemPrompt = `You are a lab assistant. Answer in 1-2 plain sentences. Use periods only. Never use asterisks, dashes, bullets, markdown, or lists. Translate medical terms into simple words.

You have access to the following logged biological samples in this lab:
${JSON.stringify(samplesContext, null, 2)}

Do not give medical advice or make up samples. Only refer to samples in the provided list. If a request is unrelated to lab work, say: "I can only help explain medical terms, lab samples, and lab workflows."
`;

    let aiText = await callGemini(messages, systemPrompt);

    if (!aiText) {
      aiText = await callOpenAI(messages, systemPrompt);
    }

    if (!aiText) {
      const hasGeminiKey = !!process.env.GEMINI_API_KEY;
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

      if (!hasGeminiKey && !hasOpenAIKey) {
        return NextResponse.json(
          { error: 'AI features are not configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your env configuration.' },
          { status: 400 }
        );
      }

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
