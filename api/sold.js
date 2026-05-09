import clientPromise from './_lib/mongodb.js';

const TIER_COLLECTIONS = {
  low: 'ids_low',
  medium: 'ids_medium',
  high: 'ids_high',
  legend: 'ids_legend'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, soldIds, tier } = req.body;

  if (!username || !soldIds || !soldIds.length) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');

  // 1. Tambah ke sold_ids global
  const globalSold = db.collection('sold_ids');
  for (const id of soldIds) {
    await globalSold.updateOne(
      { id: id },
      { $set: { id: id, seller: username, soldAt: new Date(), tier: tier } },
      { upsert: true }
    );
  }

  // 2. Tambah ke collection sold milik contributor
  const userSold = db.collection(`sold_${username}`);
  for (const id of soldIds) {
    await userSold.updateOne(
      { id: id },
      { $set: { id: id, tier: tier, soldAt: new Date() } },
      { upsert: true }
    );
  }

  // 3. Hapus dari tier collection (jika tier ditentukan)
  if (tier && TIER_COLLECTIONS[tier]) {
    const tierCollection = db.collection(TIER_COLLECTIONS[tier]);
    for (const id of soldIds) {
      await tierCollection.deleteOne({ id: id });
    }
  }

  // 4. Hapus dari collection ID contributor
  const userIds = db.collection(`ids_${username}`);
  for (const id of soldIds) {
    await userIds.deleteOne({ id: id });
  }

  // 5. Update soldTotal contributor
  await db.collection('contributors').updateOne(
    { username: username },
    { $inc: { soldTotal: soldIds.length } }
  );

  return res.status(200).json({ success: true, message: `Marked ${soldIds.length} IDs as sold` });
}
