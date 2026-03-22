const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');
const { extractOrderInfo } = require('../services/aiExtractService');

router.use(authMiddleware);

// GET /api/messages/conversations
router.get('/conversations', async (req, res) => {
  try {
    const { platform, archived = false } = req.query;

    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_archived', archived === 'true')
      .order('last_message_at', { ascending: false });

    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ conversations: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:platform/:senderId - get chat history
router.get('/:platform/:senderId', async (req, res) => {
  try {
    const { platform, senderId } = req.params;
    const { limit = 50, before } = req.query;

    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('platform', platform)
      .eq('sender_id', senderId)
      .order('received_at', { ascending: false })
      .limit(Number(limit));

    if (before) query = query.lt('received_at', before);

    const { data, error } = await query;
    if (error) throw error;

    // Mark as read
    await supabase.from('messages')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('sender_id', senderId)
      .eq('is_read', false);

    await supabase.from('conversations')
      .update({ unread_count: 0 })
      .eq('user_id', req.user.id)
      .eq('sender_id', senderId);

    res.json({ messages: data.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/send - send reply
router.post('/send', async (req, res) => {
  try {
    const { platform, sender_id, text } = req.body;

    if (!platform || !sender_id || !text) {
      return res.status(400).json({ error: 'platform, sender_id, text required' });
    }

    // Get integration token
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (!integration) {
      return res.status(400).json({ error: `${platform} not connected` });
    }

    let platformMessageId = null;

    if (platform === 'facebook') {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${integration.access_token}`,
        { recipient: { id: sender_id }, message: { text }, messaging_type: 'RESPONSE' }
      );
      platformMessageId = response.data.message_id;
    } else if (platform === 'whatsapp') {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${integration.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: sender_id,
          type: 'text',
          text: { body: text }
        },
        { headers: { Authorization: `Bearer ${integration.access_token}` } }
      );
      platformMessageId = response.data.messages?.[0]?.id;
    }

    // Save outbound message
    const { data: message } = await supabase
      .from('messages')
      .insert([{
        user_id: req.user.id,
        platform,
        platform_message_id: platformMessageId,
        sender_id,
        content: text,
        direction: 'outbound',
        is_read: true
      }])
      .select()
      .single();

    // Update conversation
    await supabase.from('conversations')
      .update({ last_message: text.substring(0, 100), last_message_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('sender_id', sender_id);

    res.json({ message });
  } catch (err) {
    console.error('Send message error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to send message', detail: err.response?.data });
  }
});

// POST /api/messages/extract - re-extract from a message
router.post('/extract', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const extracted = extractOrderInfo(text);
    res.json({ extracted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/connect/facebook - save FB page token
router.post('/connect/facebook', async (req, res) => {
  try {
    const { access_token, page_id, page_name } = req.body;
    if (!access_token || !page_id) {
      return res.status(400).json({ error: 'access_token and page_id required' });
    }

    const { data, error } = await supabase
      .from('integrations')
      .upsert([{
        user_id: req.user.id,
        platform: 'facebook',
        access_token, page_id, page_name,
        is_active: true
      }], { onConflict: 'user_id,platform' })
      .select()
      .single();

    if (error) throw error;
    res.json({ integration: { id: data.id, platform: data.platform, page_name: data.page_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/connect/whatsapp - save WA token
router.post('/connect/whatsapp', async (req, res) => {
  try {
    const { access_token, phone_number_id, business_account_id } = req.body;
    if (!access_token || !phone_number_id) {
      return res.status(400).json({ error: 'access_token and phone_number_id required' });
    }

    const { data, error } = await supabase
      .from('integrations')
      .upsert([{
        user_id: req.user.id,
        platform: 'whatsapp',
        access_token, phone_number_id, business_account_id,
        is_active: true
      }], { onConflict: 'user_id,platform' })
      .select()
      .single();

    if (error) throw error;
    res.json({ integration: { id: data.id, platform: data.platform, phone_number_id: data.phone_number_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
