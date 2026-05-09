import clientPromise from './_lib/mongodb.js';

const TIER_COLLECTIONS = {
  low: 'ids_low',
  medium: 'ids_medium',
  high: 'ids_high',
  legend: 'ids_legend'
};

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('idglitxh');

  // GET - Ambil ID dari tier tertentu
  if (req.method === 'GET') {
    const { tier } = req.query;
    const collection = db.collection(TIER_COLLECTIONS[tier] || 'ids_low');
    const docs = await collection.find({}).toArray();
    const ids = docs.map(doc => doc.id);
    return res.status(200).json({ success: true, data: ids });
  }

  // POST - Tambah ID baru
  if (req.method === 'POST') {
    const { tier, username, ids } = req.body;
    
    if (!tier || !username || !ids || !ids.length) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 1. Tambah ke tier collection
    const tierCollection = db.collection(TIER_COLLECTIONS[tier]);
    for (const id of ids) {
      await tierCollection.updateOne(
        { id: id },
        { $set: { id: id, contributor: username, addedAt: new Date() } },
        { upsert: true }
      );
    }

    // 2. Tambah ke collection milik contributor
    const userCollection = db.collection(`ids_${username}`);
    for (const id of ids) {
      await userCollection.updateOne(
        { id: id },
        { $set: { id: id, tier: tier, addedAt: new Date() } },
        { upsert: true }
      );
    }

    // 3. Update total ID contributor
    await db.collection('contributors').updateOne(
      { username: username },
      { $inc: { total: ids.length } }
    );

    return res.status(200).json({ success: true, message: `Added ${ids.length} IDs` });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
