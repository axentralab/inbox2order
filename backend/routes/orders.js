const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');
const { upsertCustomer, checkFraud } = require('../services/customerService');

// All routes require auth
router.use(authMiddleware);

// GET /api/orders - list with filters
router.get('/', async (req, res) => {
  try {
    const { status, source, date, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*, deliveries(courier, tracking_code, status)', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,order_number.ilike.%${search}%`);
    }
    if (date === 'today') {
      query = query.gte('created_at', new Date().toISOString().split('T')[0]);
    } else if (date === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('created_at', weekAgo.toISOString());
    } else if (date === 'month') {
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte('created_at', monthAgo.toISOString());
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ orders: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, deliveries(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders - create order
router.post('/', async (req, res) => {
  try {
    const {
      customer_name, customer_phone, customer_address, customer_district,
      product_name, product_variant, product_id, quantity = 1,
      unit_price, delivery_charge = 0, source = 'manual', notes, message_id
    } = req.body;

    if (!customer_name || !customer_phone || !customer_address || !product_name || !unit_price) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check monthly order limit for free plan
    if (req.user.plan === 'free') {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      const { count } = await supabase
        .from('orders').select('id', { count: 'exact' })
        .eq('user_id', req.user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (count >= req.user.plan_order_limit) {
        return res.status(403).json({
          error: `Free plan limit reached (${req.user.plan_order_limit} orders/month). Please upgrade.`
        });
      }
    }

    // Upsert customer & check fraud
    const customer = await upsertCustomer(req.user.id, {
      name: customer_name, phone: customer_phone,
      address: customer_address, district: customer_district, source
    });

    const fraudInfo = await checkFraud(req.user.id, customer_phone);

    const total_amount = (unit_price * quantity) + Number(delivery_charge);

    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        user_id: req.user.id,
        customer_id: customer?.id,
        customer_name, customer_phone,
        customer_address, customer_district,
        product_name, product_variant, product_id,
        quantity, unit_price, delivery_charge, total_amount,
        source, notes, message_id
      }])
      .select()
      .single();

    if (error) throw error;

    // Mark message as converted if from inbox
    if (message_id) {
      await supabase.from('messages')
        .update({ converted_to_order: true, order_id: order.id })
        .eq('id', message_id);
    }

    res.status(201).json({ order, fraud_warning: fraudInfo.is_suspicious ? fraudInfo : null });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id - update order
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['customer_name','customer_phone','customer_address','customer_district',
      'product_name','product_variant','quantity','unit_price','delivery_charge','notes'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (updates.unit_price || updates.quantity || updates.delivery_charge) {
      // Recalculate total
      const { data: existing } = await supabase.from('orders').select('unit_price,quantity,delivery_charge').eq('id', req.params.id).single();
      const price = updates.unit_price || existing.unit_price;
      const qty = updates.quantity || existing.quantity;
      const delivery = updates.delivery_charge !== undefined ? updates.delivery_charge : existing.delivery_charge;
      updates.total_amount = (price * qty) + Number(delivery);
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status - update status only
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending','confirmed','shipped','delivered','cancelled','returned'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Order not found' });

    // Update customer cancel count
    if (status === 'cancelled') {
      await supabase.rpc('increment_cancel_count', {
        p_user_id: req.user.id,
        p_phone: data.customer_phone
      });
    }

    res.json({ order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/stats/summary - dashboard stats
router.get('/stats/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayOrders, pendingOrders, deliveredOrders, cancelledOrders] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', req.user.id).gte('created_at', today),
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', req.user.id).eq('status', 'pending'),
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', req.user.id).eq('status', 'delivered').gte('created_at', today),
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', req.user.id).eq('status', 'cancelled').gte('created_at', today),
    ]);

    res.json({
      today_total: todayOrders.count || 0,
      pending: pendingOrders.count || 0,
      delivered_today: deliveredOrders.count || 0,
      cancelled_today: cancelledOrders.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
