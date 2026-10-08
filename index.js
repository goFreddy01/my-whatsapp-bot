const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require("@whiskeysockets/baileys")
const pino = require("pino")
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) })
    sock.ev.on('creds.update', saveCreds)
    let messages = {}
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return
        messages[msg.key.id] = msg
        if (msg.message.viewOnceMessageV2 || msg.message.viewOnceMessage) {
            let inner = msg.message.viewOnceMessageV2?.message || msg.message.viewOnceMessage?.message
            let type = Object.keys(inner)[0]
            let buffer = await downloadMediaMessage(msg, 'buffer', {})
            await sock.sendMessage(msg.key.remoteJid, { [type.replace('Message','')]: buffer, caption: "👁️ VIEW-ONCE OPENED" })
        }
    })
    sock.ev.on('messages.update', async (updates) => {
        for (let update of updates) {
            if (update.update.message === null) {
                let original = messages[update.key.id]
                if (original) {
                    await sock.sendMessage(update.key.remoteJid, { text: `🚨 DELETED: ${original.message.conversation || original.message.extendedTextMessage?.text || "[Media]"}` })
                }
            }
        }
    })
    sock.ev.on('group-participants.update', async (u) => {
        if (u.action === 'add') {
            for (let p of u.participants) {
                await sock.sendMessage(u.id, { text: `Welcome @${p.split('@')[0]} 🎉`, mentions: [p] })
            }
        }
    })
}
startBot()
