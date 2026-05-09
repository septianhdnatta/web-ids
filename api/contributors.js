import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('idglitxh');
  const contributors = db.collection('contributors');

  if (req.method === 'GET') {
    const all = await contributors.find({}).toArray();
    const safe = all.map(c => {
      delete c.pass;
      return c;
    });
    return res.status(200).json({ success: true, data: safe });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
