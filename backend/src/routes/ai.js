const router = require('express').Router();
const https = require('https');
const { auth, requireRole } = require('../middleware/auth');

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are a project management assistant. Given a problem description, break it down into actionable development tasks.
Return ONLY a valid JSON array of tasks. Each task must have:
- "title": short task title (max 10 words)
- "description": clear description of what needs to be done
- "type": one of "bug", "feature", or "enhancement"

Example format:
[{"title":"Set up authentication","description":"Implement JWT-based login and registration endpoints","type":"feature"}]

Return ONLY the JSON array, no markdown, no explanation.`;

router.post('/generate-tasks', auth, requireRole('manager'), async (req, res) => {
  if (!req.tenant.features?.ai?.enabled)
    return res.status(403).json({ message: 'AI is not enabled for this organization. Ask your admin to enable it from Settings.' });

  const aiCfg = req.tenant.features.ai;
  if (!aiCfg.apiKey || !aiCfg.model)
    return res.status(403).json({ message: 'AI is not fully configured. Ask your admin to set the API key and model in Settings.' });

  const { prompt, projectId } = req.body;
  if (!prompt || !projectId)
    return res.status(400).json({ message: 'prompt and projectId are required' });

  // always use org-level key and model — manager cannot override
  const { apiKey, model } = aiCfg;

  try {
    let tasks;

    if (model.startsWith('gpt')) {
      const result = await httpsPost('api.openai.com', '/v1/chat/completions',
        { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        { model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }], temperature: 0.7 }
      );
      if (result.status !== 200) return res.status(400).json({ message: result.body.error?.message || 'OpenAI error' });
      tasks = JSON.parse(result.body.choices[0].message.content.trim());

    } else if (model.startsWith('gemini')) {
      const result = await httpsPost('generativelanguage.googleapis.com',
        `/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { 'Content-Type': 'application/json' },
        { contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nProblem: ${prompt}` }] }] }
      );
      if (result.status !== 200) return res.status(400).json({ message: result.body.error?.message || 'Gemini error' });
      const text = result.body.candidates[0].content.parts[0].text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return res.status(500).json({ message: 'AI did not return valid task list' });
      tasks = JSON.parse(jsonMatch[0]);

    } else {
      return res.status(400).json({ message: 'Unsupported model. Use gpt-* or gemini-*' });
    }

    if (!Array.isArray(tasks)) return res.status(500).json({ message: 'AI returned unexpected format' });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET AI config status (key is masked, never sent to frontend)
router.get('/ai-status', auth, async (req, res) => {
  const ai = req.tenant.features?.ai || {};
  res.json({
    enabled:    !!ai.enabled,
    provider:   ai.provider || '',
    model:      ai.model || '',
    keyConfigured: !!(ai.apiKey && ai.apiKey.length > 0),
  });
});

module.exports = router;
