import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('idglitxh');
    
    // Ambil dari collection sold_username
    const collectionName = `sold_${username}`;
    const collections = await db.listCollections({ name: collectionName }).toArray();
    
    let soldIds = [];
    if (collections.length > 0) {
      const collection = db.collection(collectionName);
      soldIds = await collection.find({}).toArray();
    }
    
    // Ambil tier info untuk setiap sold ID
    const tierCollections = {
      low: 'ids_low',
      medium: 'ids_medium',
      high: 'ids_high',
      legend: 'ids_legend'
    };
    
    const soldWithTiers = [];
    for (const sold of soldIds) {
      let tier = null;
      for (const [tierName, colName] of Object.entries(tierCollections)) {
        const tierCol = db.collection(colName);
        const exists = await tierCol.findOne({ id: sold.id });
        if (exists) {
          tier = tierName;
          break;
        }
      }
      soldWithTiers.push({ id: sold.id, tier: tier, soldAt: sold.soldAt });
    }
    
    // Urutkan dari yang terbaru
    soldWithTiers.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
    
    return res.status(200).json({ success: true, data: soldWithTiers, count: soldWithTiers.length });
  } catch (error) {
    console.error('Error fetching sold IDs:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
