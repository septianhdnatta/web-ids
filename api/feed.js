import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  // Ambil semua ID dari semua contributor (10 terbaru)
  const contributors = await db.collection('contributors').find({}).toArray();
  const allActivities = [];
  
  for (const contributor of contributors) {
    const userCollection = db.collection(`ids_${contributor.username}`);
    const ids = await userCollection.find({}).sort({ addedAt: -1 }).limit(5).toArray();
    
    for (const id of ids) {
      allActivities.push({
        username: contributor.username,
        name: contributor.name,
        photo: contributor.photo,
        id: id.id,
        tier: id.tier,
        addedAt: id.addedAt
      });
    }
  }
  
  // Sort by date descending and take 20 latest
  allActivities.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  const recent = allActivities.slice(0, 20);
  
  return res.status(200).json({ success: true, data: recent });
}
