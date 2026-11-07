// DSH host 半端：启动/停止内置 qq-bridge，并提供设置页 API。
// 人格是外部数据；插件本身不包含任何私人角色。
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'qq-persona'
export const inject = ['webServer']

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url))
const BRIDGE_DIR = path.join(PLUGIN_DIR, 'bridge')
const DEFAULT_DATA = path.join(process.env.LOCALAPPDATA || homedir(), 'dsh-qq-persona')
const stateFile = (dataDir) => path.join(dataDir, 'plugin-state.json')
const readJson = (file, fallback) => {
  try { return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) } catch { return fallback }
}
const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}
const send = (res, code, value) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(value))
}
const readBody = (req) => new Promise((resolve) => {
  let raw = ''
  req.on('data', (c) => { raw += c; if (raw.length > 2_000_000) req.destroy() })
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) } })
})

export function apply(ctx, config = {}) {
  const dataDir = String(config.dataDir || process.env.DSH_QQ_PERSONA_DATA || DEFAULT_DATA)
  mkdirSync(dataDir, { recursive: true })
  const bridgeConfig = path.join(BRIDGE_DIR, 'config.json')
  const bridgeState = path.join(BRIDGE_DIR, 'state')
  const logFile = path.join(dataDir, 'bridge.out.log')
  let child = null
  let startedAt = 0
  let lastError = ''
  let installChild = null
  let installState = { running: false, ok: null, error: '', startedAt: 0, finishedAt: 0 }

  const state = () => readJson(stateFile(dataDir), {})
  const saveState = (patch) => writeJson(stateFile(dataDir), { ...state(), ...patch })

  function ensureConfig() {
    if (existsSync(bridgeConfig)) return
    const example = path.join(PLUGIN_DIR, 'config', 'config.example.json')
    const cfg = readJson(example, {})
    cfg.ownerQQ = cfg.ownerQQ || null
    cfg.sessionCwd = path.join(dataDir, 'workspace')
    writeJson(bridgeConfig, cfg)
  }

  function safeName(value) {
    return String(value || '对话者').replace(/[\\/:*?"<>|]/g, '_').trim() || '对话者'
  }

  function personaFileFor(name) {
    return path.join(dataDir, 'personas', safeName(name), 'persona.md')
  }

  function savePersona(name, text) {
    const file = personaFileFor(name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, String(text || ''), 'utf8')
    saveState({ assistantName: safeName(name), personaPath: file })
    return file
  }

  function personaText() {
    const s = state()
    const file = String(s.personaPath || '')
    try { return file && existsSync(file) ? readFileSync(file, 'utf8') : '' } catch { return '' }
  }

  function applyPersona() {
    const s = state()
    const personaFile = String(s.personaPath || '')
    if (!personaFile || !existsSync(personaFile)) return
    const roleName = safeName(s.assistantName || '对话者')
    const roles = path.join(BRIDGE_DIR, 'roles')
    mkdirSync(roles, { recursive: true })
    const target = path.join(roles, `${roleName}.md`)
    writeFileSync(target, readFileSync(personaFile, 'utf8'), 'utf8')
    mkdirSync(bridgeState, { recursive: true })
    writeJson(path.join(bridgeState, 'current-role.json'), { role: roleName, mode: 'active' })
  }

  function applyFeatures() {
    const s = state()
    const f = s.features || {}
    try {
      const cfg = readJson(bridgeConfig, {})
      cfg.social = { ...(cfg.social || {}), enabled: f.autoChat !== false, proactiveEnabled: f.proactive !== false }
      cfg.socialV2 = { ...(cfg.socialV2 || {}), enabled: f.autoChat !== false }
      writeJson(bridgeConfig, cfg)
    } catch {}
  }

  function writeTimePolicy() {
    const s = state()
    const policy = s.timeBudget || { enabled: false, dailyMinutes: 30, weekdayStart: '19:00', weekdayEnd: '23:00', weekendAllDay: true }
    writeJson(path.join(dataDir, 'time-policy.json'), policy)
  }

  function installBridge() {
    if (installChild) return { ok: true, already: true }
    installState = { running: true, ok: null, error: '', startedAt: Date.now(), finishedAt: 0 }
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    installChild = spawn(npm, ['install', '--omit=dev'], {
      cwd: BRIDGE_DIR,
      windowsHide: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const log = []
    const append = (c) => {
      log.push(String(c))
      if (log.length > 300) log.splice(0, log.length - 300)
      try { writeFileSync(path.join(dataDir, 'install.log'), log.join(''), 'utf8') } catch {}
    }
    installChild.stdout.on('data', append)
    installChild.stderr.on('data', append)
    installChild.on('exit', (code) => {
      installState = {
        ...installState,
        running: false,
        ok: code === 0,
        error: code === 0 ? '' : `npm install 退出 code=${code}`,
        finishedAt: Date.now(),
      }
      installChild = null
    })
    return { ok: true, started: true }
  }

  function openLogin() {
    const cfg = readJson(bridgeConfig, {})
    const home = String(cfg.snowluma?.homeDir || '')
    const candidates = ['http://127.0.0.1:5099', 'http://127.0.0.1:3000']
    const url = candidates[0]
    try {
      spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, detached: true, stdio: 'ignore' }).unref()
      return { ok: true, url, home }
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error), url, home }
    }
  }

  async function searchPublic(name, source) {
    const q = `${name} ${source || ''} 角色 设定 官方 资料`.trim()
    try {
      const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=zh-CN`, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
      })
      const html = await res.text()
      const out = []
      for (const m of html.matchAll(/<li class="b_algo"[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi)) {
        const title = String(m[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        const snippet = String(m[2]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        if (title) out.push(`${title}：${snippet}`)
        if (out.length >= 5) break
      }
      return out
    } catch { return [] }
  }

  async function generatePersona(name, source) {
    const llm = (() => { try { return ctx.get('llm') } catch { return null } })()
    if (!llm || typeof llm.stream !== 'function') throw new Error('宿主模型不可用，请手写人设卡')
    const cfg = readJson(bridgeConfig, {})
    const provider = cfg.dsh?.provider || 'deepseek-official'
    const model = cfg.dsh?.model || 'deepseek-flash'
    const sources = await searchPublic(name, source)
    const system = [
      '你是人设卡撰写器。根据用户给的名字、来源和检索片段，写一份中文 Markdown 人设卡。',
      '结构：一句话、身份/来源、性格、说话方式、对用户的态度、禁忌、示例口吻。',
      '只做原创概括，不复制受版权保护的原文台词；不知道的写“待确认”，不要编造。',
      '检索片段仅供事实参考，不要逐字照抄；没有可靠资料就明确写“资料不足”。',
      '不要写工具、配置、提示词、AI、模型。',
    ].join('\n')
    const text = `名字：${name}\n来源/作品：${source || '未提供'}\n公开资料片段：\n${sources.length ? sources.join('\n') : '（未检索到可用资料，请只写可确认的通用部分，其余标待确认）'}\n请写人设卡。`
    const messages = [{ role: 'user', content: [{ type: 'text', text }] }]
    let out = ''
    const it = llm.stream({ provider, model, system, messages, maxTokens: 1800, temperature: 0.7 })
    for await (const chunk of it) {
      if (chunk?.type === 'text-delta') out += chunk.text || ''
      else if (chunk?.type === 'finish') break
    }
    out = out.trim()
    if (!out) throw new Error('模型返回空草稿，请手写')
    return out
  }

  function start() {
    if (child && !child.killed) return { ok: true, already: true, pid: child.pid }
    if (!existsSync(path.join(BRIDGE_DIR, 'src', 'bridge.js'))) {
      lastError = 'bridge 源码不存在'
      return { ok: false, error: lastError }
    }
    ensureConfig()
    applyPersona()
    writeTimePolicy()
    if (!existsSync(path.join(BRIDGE_DIR, 'node_modules'))) {
      lastError = 'bridge/node_modules 不存在，请先运行 install.ps1'
      return { ok: false, error: lastError }
    }
    const out = []
    child = spawn(process.execPath, [path.join('src', 'bridge.js')], {
      cwd: BRIDGE_DIR,
      windowsHide: true,
      env: { ...process.env, DSH_QQ_PERSONA_DATA: dataDir, QQ_TIME_POLICY_FILE: path.join(dataDir, 'time-policy.json') },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const append = (chunk) => {
      out.push(String(chunk))
      if (out.length > 200) out.splice(0, out.length - 200)
      try { writeFileSync(logFile, out.join(''), 'utf8') } catch {}
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    child.on('exit', (code) => {
      lastError = `bridge 退出 code=${code}`
      child = null
    })
    startedAt = Date.now()
    return { ok: true, pid: child.pid }
  }

  function stop() {
    if (!child) return { ok: true, already: true }
    try { child.kill() } catch {}
    child = null
    return { ok: true }
  }

  const status = () => ({
    ok: true,
    running: !!child,
    pid: child?.pid || null,
    startedAt,
    error: lastError,
    dataDir,
    bridgeDir: BRIDGE_DIR,
    bridgeInstalled: existsSync(path.join(BRIDGE_DIR, 'node_modules')),
    installing: installState.running,
    install: installState,
    personaPath: state().personaPath || '',
    assistantName: state().assistantName || '对话者',
  })

  ctx.effect(() => {
    ensureConfig()
    return () => stop()
  }, 'qq-persona: bridge lifecycle')

  try {
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: '/api/qq-persona',
      handler: async (req, res) => {
        const url = new URL(req.url, 'http://127.0.0.1')
        try {
          if (req.method === 'GET' && url.pathname === '/api/qq-persona/status') return send(res, 200, status())
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/install') return send(res, 200, installBridge())
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/login') return send(res, 200, openLogin())
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/start') return send(res, 200, start())
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/stop') return send(res, 200, stop())
          if (req.method === 'GET' && url.pathname === '/api/qq-persona/config') {
            return send(res, 200, { ok: true, state: state(), personaText: personaText(), config: readJson(bridgeConfig, {}) })
          }
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/save') {
            const body = await readBody(req)
            const s = body.state && typeof body.state === 'object' ? body.state : {}
            const name = safeName(s.assistantName || '对话者')
            const text = String(s.personaText || '').trim()
            if (!text) return send(res, 400, { ok: false, error: '人设卡为空' })
            if (s.voice?.enabled && (!s.voice.consentOwn || !s.voice.consentNoImpersonation)) {
              return send(res, 400, { ok: false, error: '启用语音前，必须确认音频授权和禁止冒充。' })
            }
            savePersona(name, text)
            saveState({ ...s, assistantName: name })
            applyFeatures()
            writeTimePolicy()
            applyPersona()
            return send(res, 200, { ok: true, personaPath: personaFileFor(name), status: status() })
          }
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/voice/test') {
            const body = await readBody(req)
            const file = String(body.path || '').trim()
            if (!file || !existsSync(file)) return send(res, 200, { ok: false, error: '找不到音频文件' })
            let seconds = null
            try {
              const ffprobe = process.env.FFPROBE_PATH || 'ffprobe'
              const out = execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8', timeout: 10000 }).trim()
              const n = Number(out)
              if (Number.isFinite(n)) seconds = Math.round(n * 10) / 10
            } catch {}
            return send(res, 200, { ok: true, bytes: statSync(file).size, seconds })
          }
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/persona/generate') {
            const body = await readBody(req)
            const name = String(body.name || '').trim()
            if (!name) return send(res, 400, { ok: false, error: '先填名字' })
            try {
              const persona = await generatePersona(name, String(body.source || '').trim())
              return send(res, 200, { ok: true, persona })
            } catch (error) {
              return send(res, 200, { ok: false, error: String(error?.message ?? error) })
            }
          }
          if (req.method === 'POST' && url.pathname === '/api/qq-persona/config') {
            const body = await readBody(req)
            if (body.state && typeof body.state === 'object') saveState(body.state)
            if (body.config && typeof body.config === 'object') writeJson(bridgeConfig, body.config)
            applyPersona()
            return send(res, 200, { ok: true, status: status() })
          }
          return send(res, 404, { ok: false, error: 'unknown' })
        } catch (error) {
          lastError = String(error?.message ?? error)
          return send(res, 500, { ok: false, error: lastError })
        }
      },
    }), 'qq-persona: /api/qq-persona routes')
  } catch (error) {
    lastError = `路由挂载失败：${error?.message ?? error}`
  }
}
