const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../db/supabase');
const { extractOrderInfo } = require('../services/aiExtractService');

// ============================================================
// FACEBOOK MESSENGER WEBHOOK
// ============================================================

// Webhook verification (GET)
router.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    console.log('Facebook webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Receive messages (POST)
router.post('/facebook', async (req, res) => {
  try {
    // Verify signature
    const signature = req.headers['x-hub-signature-256'];
    if (!verifyFacebookSignature(req.body, signature)) {
      return res.sendStatus(403);
    }

    const body = JSON.parse(req.body.toString());
    if (body.object !== 'page') return res.sendStatus(404);

    for (const entry of body.entry || []) {
      const pageId = entry.id;

      // Find which seller owns this page
      const { data: integration } = await supabase
        .from('integrations')
        .select('user_id')
        .eq('platform', 'facebook')
        .eq('page_id', pageId)
        .eq('is_active', true)
        .single();

      if (!integration) continue;

      for (const event of entry.messaging || []) {
        if (event.message && !event.message.is_echo) {
          await handleIncomingMessage({
            userId: integration.user_id,
            platform: 'facebook',
            senderId: event.sender.id,
            messageId: event.message.mid,
            text: event.message.text || '',
            timestamp: event.timestamp,
            rawPayload: event
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('FB webhook error:', err);
    res.sendStatus(200); // Always 200 to FB
  }
});

// ============================================================
// WHATSAPP CLOUD API WEBHOOK
// ============================================================

// Webhook verification (GET)
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Receive messages (POST)
router.post('/whatsapp', async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString());
    if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;

        // Find which seller owns this WA number
        const { data: integration } = await supabase
          .from('integrations')
          .select('user_id')
          .eq('platform', 'whatsapp')
          .eq('phone_number_id', phoneNumberId)
          .eq('is_active', true)
          .single();

        if (!integration) continue;

        for (const msg of value.messages || []) {
          if (msg.type === 'text') {
            const contact = value.contacts?.find(c => c.wa_id === msg.from);
            await handleIncomingMessage({
              userId: integration.user_id,
              platform: 'whatsapp',
              senderId: msg.from,
              senderName: contact?.profile?.name,
              senderPhone: msg.from,
              messageId: msg.id,
              text: msg.text?.body || '',
              timestamp: msg.timestamp * 1000,
              rawPayload: msg
            });
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('WA webhook error:', err);
    res.sendStatus(200);
  }
});

// ============================================================
// SHARED MESSAGE HANDLER
// ============================================================
async function handleIncomingMessage({ userId, platform, senderId, senderName, senderPhone, messageId, text, timestamp, rawPayload }) {
  try {
    // AI extract order info from message
    const extracted = await extractOrderInfo(text);

    // Save message
    const { data: message } = await supabase
      .from('messages')
      .upsert([{
        user_id: userId,
        platform,
        platform_message_id: messageId,
        sender_id: senderId,
        sender_name: senderName || extracted.name,
        sender_phone: senderPhone || extracted.phone,
        content: text,
        direction: 'inbound',
        extracted_data: extracted,
        raw_payload: rawPayload,
        received_at: new Date(Number(timestamp)).toISOString()
      }], { onConflict: 'platform_message_id' })
      .select()
      .single();

    // Upsert conversation
    await supabase
      .from('conversations')
      .upsert([{
        user_id: userId,
        platform,
        sender_id: senderId,
        sender_name: senderName || extracted.name,
        sender_phone: senderPhone || extracted.phone,
        last_message: text.substring(0, 100),
        last_message_at: new Date(Number(timestamp)).toISOString(),
        unread_count: supabase.rpc('increment', { x: 1 }) // handled in DB
      }], { onConflict: 'user_id,platform,sender_id' });

  } catch (err) {
    console.error('Handle message error:', err);
  }
}

// ============================================================
// HELPERS
// ============================================================
function verifyFacebookSignature(rawBody, signature) {
  if (!signature) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

module.exports = router;
