import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { password } = req.body;

  const client = await clientPromise;
  const db = client.db('idglitxh');
  const admins = db.collection('admins');

  // Cek apakah sudah ada admin
  const existingAdmin = await admins.findOne({});
  
  if (existingAdmin) {
    // Cek password
    if (existingAdmin.pass === password) {
      return res.status(200).json({ success: true, data: existingAdmin, isFirstTime: false });
    } else {
      return res.status(401).json({ success: false, error: 'Password salah' });
    }
  }

  // Belum ada admin, buat baru
  const newAdmin = {
    username: 'admin',
    name: 'Administrator',
    pass: password,
    role: 'ADMIN',
    createdAt: new Date()
  };
  
  await admins.insertOne(newAdmin);
  
  return res.status(200).json({ success: true, data: newAdmin, isFirstTime: true });
}
