import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');

  // Ambil ID milik contributor
  const userCollection = db.collection(`ids_${username}`);
  const ids = await userCollection.find({}).toArray();
  
  // Ambil sold IDs milik contributor
  const soldCollection = db.collection(`sold_${username}`);
  const soldDocs = await soldCollection.find({}).toArray();
  const soldSet = new Set(soldDocs.map(d => d.id));

  const result = ids.map(doc => ({
    id: doc.id,
    tier: doc.tier,
    isSold: soldSet.has(doc.id)
  }));

  return res.status(200).json({ success: true, data: result });
}
