const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('products').select('*')
    .eq('user_id', req.user.id).eq('is_active', true)
    .order('total_sold', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

router.post('/', async (req, res) => {
  const { name, description, price, price_max, stock, category, image_url } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
  const { data, error } = await supabase
    .from('products').insert([{ user_id: req.user.id, name, description, price, price_max, stock, category, image_url }])
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ product: data });
});

router.put('/:id', async (req, res) => {
  const { name, description, price, price_max, stock, category } = req.body;
  const { data, error } = await supabase
    .from('products').update({ name, description, price, price_max, stock, category })
    .eq('id', req.params.id).eq('user_id', req.user.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ product: data });
});

router.delete('/:id', async (req, res) => {
  await supabase.from('products').update({ is_active: false })
    .eq('id', req.params.id).eq('user_id', req.user.id);
  res.json({ message: 'Product deleted' });
});

module.exports = router;
