import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, active } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');
  const contributors = db.collection('contributors');

  const result = await contributors.updateOne(
    { username: username },
    { $set: { active: active } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  return res.status(200).json({ success: true, message: `User ${active ? 'unblocked' : 'blocked'}` });
}
