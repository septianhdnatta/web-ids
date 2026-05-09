import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');

  // Hapus dari contributors
  const result = await db.collection('contributors').deleteOne({ username: username });
  
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Hapus collection ids_username
  try {
    await db.collection(`ids_${username}`).drop();
  } catch(e) {}
  
  // Hapus collection sold_username
  try {
    await db.collection(`sold_${username}`).drop();
  } catch(e) {}

  return res.status(200).json({ success: true, message: 'User deleted successfully' });
}
