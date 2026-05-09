import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, name, photo, bio, wa, password } = req.body;

  if (!username || !name || !wa || !password) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');
  const contributors = db.collection('contributors');

  const existing = await contributors.findOne({ username: username.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, error: 'Username already exists' });
  }

  const newContributor = {
    username: username.toLowerCase(),
    name: name,
    photo: photo || '',
    bio: bio || '',
    wa: wa,
    pass: password,
    role: 'CB',
    verified: false,
    total: 0,
    soldTotal: 0,
    active: true,  // <-- FIELD BARU
    joined: new Date().toISOString().split('T')[0],
    createdAt: new Date()
  };

  await contributors.insertOne(newContributor);

  // Buat collection khusus untuk ID contributor
  await db.createCollection(`ids_${username.toLowerCase()}`);
  await db.createCollection(`sold_${username.toLowerCase()}`);

  delete newContributor.pass;
  return res.status(200).json({ success: true, data: newContributor, message: 'Registration successful!' });
}
