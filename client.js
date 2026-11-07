window.__ModuleLoader__.load({
  id: 'dsh-qq-persona',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React
    const API = '/api/qq-persona'

    const input = (value, onChange, placeholder, multiline) => multiline
      ? h('textarea', {
        value: value || '',
        placeholder: placeholder || '',
        onChange: (e) => onChange(e.target.value),
        rows: 18,
        style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #555', background: 'transparent', color: 'inherit', resize: 'vertical' },
      })
      : h('input', {
        value: value || '',
        placeholder: placeholder || '',
        onChange: (e) => onChange(e.target.value),
        style: { width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 8, border: '1px solid #555', background: 'transparent', color: 'inherit' },
      })

    const toggle = (label, hint, checked, onChange) => h('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', margin: '9px 0' } },
      h('input', { type: 'checkbox', checked: !!checked, onChange: (e) => onChange(e.target.checked), style: { marginTop: 3 } }),
      h('span', null,
        h('div', null, label),
        hint ? h('div', { style: { fontSize: 12, opacity: 0.6 } }, hint) : null,
      ),
    )

    function Panel() {
      const [status, setStatus] = useState(null)
      const [name, setName] = useState('对话者')
      const [source, setSource] = useState('')
      const [persona, setPersona] = useState('')
      const [features, setFeatures] = useState({
        autoChat: true, proactive: true, groupChat: false,
        autoQzone: false, voice: false, autoDouyin: false, quietNight: true, diary: true,
      })
      const [timeBudget, setTimeBudget] = useState({
        enabled: false, dailyMinutes: 30, weekdayStart: '19:00', weekdayEnd: '23:00', weekendAllDay: true,
      })
      const [voice, setVoice] = useState({
        enabled: false, refAudio: '', consentOwn: false, consentNoImpersonation: false,
      })
      const [msg, setMsg] = useState('')
      const [busy, setBusy] = useState(false)

      const refresh = async () => {
        const s = await fetch(`${API}/status`).then((r) => r.json()).catch(() => null)
        const c = await fetch(`${API}/config`).then((r) => r.json()).catch(() => null)
        if (s) setStatus(s)
        if (c?.state) {
          if (c.state.assistantName) setName(c.state.assistantName)
          if (c.state.source) setSource(c.state.source)
          if (c.state.personaText) setPersona(c.state.personaText)
          if (c.state.features) setFeatures((f) => ({ ...f, ...c.state.features }))
          if (c.state.timeBudget) setTimeBudget((t) => ({ ...t, ...c.state.timeBudget }))
          if (c.state.voice) setVoice((v) => ({ ...v, ...c.state.voice }))
        }
      }
      useEffect(() => { refresh() }, [])

      const generate = async () => {
        if (!name.trim()) { setMsg('先填名字'); return }
        setBusy(true); setMsg('正在生成草稿…')
        try {
          const r = await fetch(`${API}/persona/generate`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), source: source.trim() }),
          }).then((x) => x.json())
          if (r.ok && r.persona) { setPersona(r.persona); setMsg('草稿已生成，可以改；确认后再保存。') }
          else setMsg(r.error || '生成失败，请手写')
        } finally { setBusy(false) }
      }

      const save = async () => {
        if (voice.enabled && (!voice.consentOwn || !voice.consentNoImpersonation)) {
          setMsg('启用语音前，必须勾选两项授权确认。')
          return
        }
        setBusy(true); setMsg('')
        try {
          const r = await fetch(`${API}/save`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ state: { assistantName: name.trim(), source: source.trim(), personaText: persona, features, timeBudget, voice } }),
          }).then((x) => x.json())
          setMsg(r.ok ? '已保存。接下来点“启动 bridge”。' : (r.error || '保存失败'))
          await refresh()
        } finally { setBusy(false) }
      }

      const checkVoice = async () => {
        setBusy(true); setMsg('')
        try {
          const r = await fetch(`${API}/voice/test`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: voice.refAudio }),
          }).then((x) => x.json())
          setMsg(r.ok ? `音频可用：${r.seconds ? r.seconds + ' 秒' : '已找到'}。TTS 接入后用它做参考。` : (r.error || '音频不可用'))
        } finally { setBusy(false) }
      }

      const call = async (path) => {
        setBusy(true); setMsg('')
        try {
          const r = await fetch(`${API}/${path}`, { method: 'POST' }).then((x) => x.json())
          const label = { start: 'bridge 已启动', stop: 'bridge 已停止', install: '正在安装依赖…', login: '已打开 QQ 登录页' }[path]
          setMsg(r.ok ? label : (r.error || '失败'))
          await refresh()
        } finally { setBusy(false) }
      }

      return h('div', { style: { padding: 18, maxWidth: 860 } },
        h('h2', { style: { margin: '0 0 6px' } }, 'QQ对话'),
        h('div', { style: { opacity: 0.65, fontSize: 12, marginBottom: 16 } },
          '人设卡是外部文件；这个插件不包含任何私人角色。'),
        status ? h('div', { style: { padding: 10, marginBottom: 14, border: '1px solid #444', borderRadius: 8, fontSize: 13 } },
          `${status.running ? '运行中' : '未运行'}${status.pid ? ` · PID ${status.pid}` : ''} · bridge 依赖：${status.bridgeInstalled ? '已安装' : '未安装'}${status.installing ? ' · 正在安装' : ''}`,
          status.error ? h('div', { style: { color: '#e88', marginTop: 4 } }, status.error) : null,
        ) : null,

        h('div', { style: { fontWeight: 600, marginTop: 8 } }, '对话者'),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' } },
          h('div', { style: { flex: '1 1 280px' } }, input(name, setName, '名字，例如：对话者')),
          h('div', { style: { flex: '1 1 220px' } }, input(source, setSource, '来源/作品，可选；重名时用')),
          h('button', { onClick: generate, disabled: busy, style: { padding: '8px 14px' } }, '自动生成草稿'),
        ),
        h('div', { style: { fontSize: 12, opacity: 0.55, marginTop: 6 } },
          '自动生成是草稿：会基于公开资料概括，不复制原文台词；不满意可以直接手写。'),

        h('div', { style: { marginTop: 16, fontWeight: 600 } }, '人设卡'),
        h('div', { style: { marginTop: 6 } }, input(persona, setPersona, '自动生成后填在这里；也可以自己手写。', true)),

        h('div', { style: { marginTop: 18, fontWeight: 600 } }, '开关'),
        toggle('自动回复私聊', '收到消息就回', features.autoChat, (v) => setFeatures({ ...features, autoChat: v })),
        toggle('私聊主动开口', '安静一段时间可以自己找人说话', features.proactive, (v) => setFeatures({ ...features, proactive: v })),
        toggle('群聊自动接话', '默认关闭；待接入，目前只保存', features.groupChat, (v) => setFeatures({ ...features, groupChat: v })),
        toggle('自动发 QQ 空间', '默认关闭；待接入，先只保存', features.autoQzone, (v) => setFeatures({ ...features, autoQzone: v })),
        toggle('抖音自动分享', '由抖音插件执行；这里只保存开关', features.autoDouyin, (v) => setFeatures({ ...features, autoDouyin: v })),
        toggle('深夜免打扰', '23:00–08:00 不主动', features.quietNight, (v) => setFeatures({ ...features, quietNight: v })),
        toggle('写日记', '只写本地，不公开', features.diary, (v) => setFeatures({ ...features, diary: v })),

        h('div', { style: { marginTop: 20, fontWeight: 600 } }, 'QQ 聊天时间预算'),
        h('div', { style: { fontSize: 12, opacity: 0.6, margin: '6px 0' } },
          '控制这个 QQ 对话者的自动聊天/主动开口时间；关掉总开关就不限时。抖音另有自己的预算。'),
        toggle('启用时间预算', '到点才自动聊天/主动开口', timeBudget.enabled, (v) => setTimeBudget({ ...timeBudget, enabled: v })),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          h('span', null, '每天'),
          h('input', { type: 'number', min: 1, max: 600, value: timeBudget.dailyMinutes,
            onChange: (e) => setTimeBudget({ ...timeBudget, dailyMinutes: Number(e.target.value) || 1 }),
            style: { width: 76, padding: 6 } }),
          h('span', null, '分钟'),
          h('span', { style: { marginLeft: 12 } }, '工作日'),
          h('input', { type: 'time', value: timeBudget.weekdayStart,
            onChange: (e) => setTimeBudget({ ...timeBudget, weekdayStart: e.target.value }) }),
          h('span', null, '→'),
          h('input', { type: 'time', value: timeBudget.weekdayEnd,
            onChange: (e) => setTimeBudget({ ...timeBudget, weekdayEnd: e.target.value }) }),
        ),
        toggle('周末全天可聊', '关掉则周末也按上面的时间', timeBudget.weekendAllDay, (v) => setTimeBudget({ ...timeBudget, weekendAllDay: v })),

        h('div', { style: { marginTop: 20, fontWeight: 600 } }, '语音'),
        toggle('启用语音', '默认关闭；需要自己安装 TTS 并准备授权音频', voice.enabled, (v) => setVoice({ ...voice, enabled: v })),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' } },
          h('button', { onClick: () => window.open('https://github.com/RVC-Boss/GPT-SoVITS/releases', '_blank') }, '打开 TTS 安装页'),
          h('span', { style: { fontSize: 12, opacity: 0.6, alignSelf: 'center' } }, '不自动下载，不打包模型'),
        ),
        h('div', { style: { fontSize: 12, opacity: 0.7, marginBottom: 4 } }, '参考音频路径（10–30 秒，单人，无音乐）'),
        input(voice.refAudio, (v) => setVoice({ ...voice, refAudio: v }), 'D:\\my-voice\\reference.wav'),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' } },
          h('button', { onClick: checkVoice, disabled: busy || !voice.refAudio }, '检查音频'),
        ),
        h('label', { style: { display: 'flex', gap: 8, marginTop: 10 } },
          h('input', { type: 'checkbox', checked: voice.consentOwn, onChange: (e) => setVoice({ ...voice, consentOwn: e.target.checked }) }),
          h('span', null, '我确认这段音频是我自己的，或已获得说话人的明确授权。'),
        ),
        h('label', { style: { display: 'flex', gap: 8, marginTop: 6 } },
          h('input', { type: 'checkbox', checked: voice.consentNoImpersonation, onChange: (e) => setVoice({ ...voice, consentNoImpersonation: e.target.checked }) }),
          h('span', null, '我确认不会用它冒充他人、公众人物或未成年人。'),
        ),

        h('div', { style: { display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' } },
          h('button', { onClick: save, disabled: busy }, '保存'),
          h('button', { onClick: () => call('install'), disabled: busy || status?.bridgeInstalled }, status?.bridgeInstalled ? '依赖已安装' : '安装 bridge 依赖'),
          h('button', { onClick: () => call('login'), disabled: busy }, '打开 QQ 登录'),
          h('button', { onClick: () => call('start'), disabled: busy }, '启动 bridge'),
          h('button', { onClick: () => call('stop'), disabled: busy }, '停止 bridge'),
          h('button', { onClick: refresh, disabled: busy }, '刷新'),
        ),
        msg ? h('div', { style: { marginTop: 12, color: msg.includes('失败') || msg.includes('先填') ? '#e88' : '#8c8' } }, msg) : null,
        h('p', { style: { opacity: 0.55, fontSize: 12, marginTop: 18 } },
          '第一次使用：安装 bridge 依赖 → 保存人设 → 打开 QQ 登录扫码 → 启动 bridge。'),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const slots = (typeof ctx.get === 'function' ? ctx.get('slots') : undefined) || ctx.slots
        if (!slots) return
        slots.inject('settings.section', () => slots.register(
          { name: 'settings.section', id: 'qq-persona', order: 32, label: 'QQ对话' },
          () => h(Panel),
        ))
      },
    }
  },
})
