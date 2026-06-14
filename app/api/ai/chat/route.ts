import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { getSamplesForLab } from '@/lib/db/samples';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch and verify the database user
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, labId: true, role: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    // 3. Parse and validate the input chat history
    const body = await req.json();
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages history is required.' }, { status: 400 });
    }

    // 4. Fetch the lab's samples to build the context
    const samples = await getSamplesForLab(dbUser.labId);
    const samplesContext = samples.map((s) => ({
      displayId: s.humanId,
      type: s.sampleType,
      source: s.source,
      phase: s.currentPhase || 'Not Started',
      experiment: s.experimentType || 'None',
      date: s.collectionDate.toISOString().split('T')[0],
    })).slice(0, 50); // limit to avoid token exhaustion

    const systemPrompt = `You are a lab assistant. Answer in 1-2 plain sentences. Use periods only. Never use asterisks, dashes, bullets, markdown, or lists. Translate medical terms into simple words.

You have access to the following logged biological samples in this lab:
${JSON.stringify(samplesContext, null, 2)}

Do not give medical advice or make up samples. Only refer to samples in the provided list. If a request is unrelated to lab work, say: "I can only help explain medical terms, lab samples, and lab workflows."
`;

    // 5. Select API provider and call model
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      // Format history into Gemini format
      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
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
        console.error('[POST /api/ai/chat] Gemini API error:', errText);
        throw new Error('Gemini API call failed');
      }

      const resJson = await response.json();
      const aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) {
        throw new Error('Invalid response from Gemini API');
      }

      return NextResponse.json({ message: aiText }, { status: 200 });

    } else if (openaiKey) {
      // Format history into OpenAI format
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: formattedMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[POST /api/ai/chat] OpenAI API error:', errText);
        throw new Error('OpenAI API call failed');
      }

      const resJson = await response.json();
      const aiText = resJson?.choices?.[0]?.message?.content;
      if (!aiText) {
        throw new Error('Invalid response from OpenAI API');
      }

      return NextResponse.json({ message: aiText }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'AI features are not configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your env configuration.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[POST /api/ai/chat]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
