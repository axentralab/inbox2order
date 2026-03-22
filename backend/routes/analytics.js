const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

router.use(authMiddleware);

router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    const [
      { count: monthOrders },
      { count: lastMonthOrders },
      { count: deliveredOrders },
      { count: cancelledOrders },
      { count: totalCustomers },
      { data: topProducts }
    ] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', userId).gte('created_at', startOfMonth),
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', userId).gte('created_at', lastMonth).lte('created_at', endLastMonth),
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', userId).eq('status', 'delivered').gte('created_at', startOfMonth),
      supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', userId).eq('status', 'cancelled').gte('created_at', startOfMonth),
      supabase.from('customers').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('products').select('name, total_sold').eq('user_id', userId).order('total_sold', { ascending: false }).limit(5)
    ]);

    const conversionRate = monthOrders > 0 ? Math.round((deliveredOrders / monthOrders) * 100) : 0;
    const cancelRate = monthOrders > 0 ? Math.round((cancelledOrders / monthOrders) * 100) : 0;
    const growth = lastMonthOrders > 0 ? Math.round(((monthOrders - lastMonthOrders) / lastMonthOrders) * 100) : 0;

    res.json({
      month_orders: monthOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      conversion_rate: conversionRate,
      cancel_rate: cancelRate,
      growth_percent: growth,
      total_customers: totalCustomers,
      top_products: topProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('orders')
      .select('created_at, status')
      .eq('user_id', req.user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const grouped = {};
    data.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!grouped[date]) grouped[date] = { date, total: 0, delivered: 0, cancelled: 0 };
      grouped[date].total++;
      if (order.status === 'delivered') grouped[date].delivered++;
      if (order.status === 'cancelled') grouped[date].cancelled++;
    });

    res.json({ daily: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
