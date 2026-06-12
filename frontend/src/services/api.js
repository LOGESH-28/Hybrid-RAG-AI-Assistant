export async function streamChat({ question, sessionId = 'default', temperature = 0.7, model = 'llama-3.3-70b-versatile', onChunk, onDone, onError }) {
  try {
    const res = await fetch('/ask/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, session_id: sessionId, temperature, max_length: 2048 }),
    })
    if (!res.ok) { onError(await res.text()); return }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let full = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      full += chunk
      onChunk(full)
    }
    onDone(full)
  } catch (e) {
    onError(e.message)
  }
}

export async function uploadFile(file, sessionId = 'default') {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`/upload?session_id=${sessionId}`, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Upload failed')
  return data
}

export async function getStatus() {
  const res = await fetch('/status')
  return res.json()
}

export async function getAdminStats() {
  const res = await fetch('/admin/stats')
  return res.json()
}

export async function clearHistory(sessionId = 'default') {
  await fetch('/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
}

export async function agentAsk(question, sessionId = 'default') {
  const res = await fetch('/agent/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
  })
  return res.json()
}

// --- Multi-Chat Session API ---

export async function getSessions() {
  const res = await fetch('/sessions')
  return res.json()
}

export async function createSession(id, title = 'New Chat') {
  const res = await fetch('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title }),
  })
  return res.json()
}

export async function updateSession(id, fields) {
  const res = await fetch(`/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
  return res.json()
}

export async function deleteSession(id) {
  const res = await fetch(`/sessions/${id}`, {
    method: 'DELETE',
  })
  return res.json()
}

// --- Files API ---

export async function listFiles() {
  const res = await fetch('/files')
  return res.json()
}

export async function deleteFile(filename) {
  const res = await fetch(`/files/${filename}`, {
    method: 'DELETE',
  })
  return res.json()
}

// --- Tools API ---

export async function runTool(toolName, payload) {
  const res = await fetch('/tools/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool_name: toolName, payload }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Tool execution failed')
  return data
}

// --- Memories API ---

export async function getMemories(sessionId) {
  const res = await fetch(`/memory/${sessionId}`)
  return res.json()
}

export async function saveMemory(sessionId, key, value) {
  const res = await fetch(`/memory/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  return res.json()
}

export async function clearMemories(sessionId) {
  const res = await fetch(`/memory/${sessionId}`, {
    method: 'DELETE',
  })
  return res.json()
}
