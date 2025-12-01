/* eslint-disable @typescript-eslint/no-explicit-any */

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'explain',
    title: '選択したテキストを簡単に説明',
    contexts: ['selection'],
  });
});

const pendingMessages: Record<number, any[]> = {};

const systemPrompt =
  'You are a helpful dictionary assistant. You explain English words simply for learners. You MUST return only valid JSON. Do not include any other text.';

// check model status
const checkModelStatus = async () => {
  let session: any = null;
  try {
    // Check availability first
    const availability = await LanguageModel?.availability();

    switch (availability) {
      case 'available':
        break;
      case 'unavailable':
        throw new Error('AI model is unavailable on this device (insufficient power or disk space)');
      case 'downloading':
        throw new Error('AI model is currently downloading. Please wait and try again.');
      case 'downloadable':
        // Use initialPrompts format for downloadable models
        session = await LanguageModel!.create({
          initialPrompts: [
            {
              role: 'system',
              content: 'hello!',
            },
          ],
        });

        // destroy session
        if (session?.destroy) {
          await session.destroy();
        }
    }
  } catch (e) {
    console.error('[Background] Model check failed:', e);
    throw e;
  }
};

// create session
const createSession = async () => {
  try {
    const session = await LanguageModel!.create({
      initialPrompts: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
    });

    return session;
  } catch (e) {
    console.error('[Background] Failed to create session:', e);
    throw e;
  }
};

// check availability status when page loaded
const checkModelOnPageLoad = async () => {
  try {
    await checkModelStatus();
  } catch (e) {
    console.error('[Background] Page load model check failed:', e);
  }
};

const explainText = async (text: string, tabId: number) => {
  let session: any = null;

  try {
    // Always create fresh session
    session = await createSession();

    // 3. Prompt
    const prompt = `
Word: ${text}

Return a JSON object with this format:
{
  "originText": "${text}",
  "partOfSpeech": "noun/verb/etc",
  "description": "simple definition",
  "similar1": "synonym1",
  "similar2": "synonym2",
  "similar3": "synonym3"
}
`;

    let result;
    if (session.prompt) {
      result = await session.prompt(prompt);
    } else {
      // Fallback if signature differs
      result = (await session.promptStreaming) ? await session.promptStreaming(prompt) : 'Error: No prompt method';
    }

    // 4. Parse Result
    let parsedResult;
    try {
      // Attempt to find JSON in the output if it's mixed with text
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : result;
      parsedResult = JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[Background] Failed to parse JSON, using raw text', e);
      parsedResult = { description: result, originText: text };
    }

    // Ensure all fields exist
    parsedResult = {
      originText: text,
      partOfSpeech: parsedResult.partOfSpeech || 'Unknown',
      description: parsedResult.description || result,
      similar1: parsedResult.similar1 || '',
      similar2: parsedResult.similar2 || '',
      similar3: parsedResult.similar3 || '',
    };

    // 5. Send to Tab
    if (!pendingMessages[tabId]) pendingMessages[tabId] = [];
    pendingMessages[tabId].push(parsedResult);

    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW',
        data: parsedResult,
      });
    } catch (e) {
      console.error('[Background] Failed to send success message to tab:', e);
    }
  } catch (error: any) {
    console.error('[Background] Error explaining text:', error);
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW',
        data: {
          description: `Error: ${error.message || 'Unknown error occurred'}. Please ensure you have Chrome Canary with "Prompt API for Gemini Nano" enabled.`,
          originText: text,
        },
      });
    } catch (sendError) {
      console.error('[Background] Failed to send error message to tab:', sendError);
    }
  } finally {
    // Always destroy the session after use
    if (session?.destroy) {
      await session.destroy();
    }
  }
};

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !info.selectionText) {
    return;
  }

  switch (info.menuItemId) {
    case 'explain': {
      await explainText(info.selectionText, tab.id);
      break;
    }
  }
});

// Content Script から ready ping を受信
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CONTENT_READY' && sender.tab?.id) {
    const tabId = sender.tab.id;

    checkModelOnPageLoad();

    const messages = pendingMessages[tabId] || [];
    messages.forEach(m => {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW', data: m });
    });
    pendingMessages[tabId] = [];
  } else if (msg.type === 'EXPLAIN_TEXT' && sender.tab?.id && msg.text) {
    explainText(msg.text, sender.tab.id);
  }
});
