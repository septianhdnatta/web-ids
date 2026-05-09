import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, name, photo, bio, wa } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (photo !== undefined) updateData.photo = photo;
  if (bio !== undefined) updateData.bio = bio;
  if (wa !== undefined) updateData.wa = wa;

  await db.collection('contributors').updateOne(
    { username: username },
    { $set: updateData }
  );

  return res.status(200).json({ success: true, message: 'Profile updated' });
}
