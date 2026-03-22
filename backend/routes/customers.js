const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { flagged, search } = req.query;
    let query = supabase.from('customers').select('*')
      .eq('user_id', req.user.id)
      .order('total_orders', { ascending: false });
    if (flagged === 'true') query = query.eq('is_flagged', true);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ customers: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/flag', async (req, res) => {
  try {
    const { is_flagged, flag_reason } = req.body;
    const { data, error } = await supabase
      .from('customers')
      .update({ is_flagged, flag_reason })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ customer: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
