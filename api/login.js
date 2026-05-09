import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Missing username or password' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');
  const contributors = db.collection('contributors');

  const user = await contributors.findOne({ 
    username: username.toLowerCase(), 
    pass: password 
  });

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }

  // Jangan kirim password
  delete user.pass;

  return res.status(200).json({ success: true, data: user });
}
