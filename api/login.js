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
  
  // Cek di contributors
  let user = await db.collection('contributors').findOne({ 
    username: username.toLowerCase(), 
    pass: password 
  });

  if (user) {
    // Cek apakah user di-block
    if (user.active === false) {
      return res.status(403).json({ success: false, error: 'Akun Anda telah diblokir oleh admin. Hubungi admin untuk informasi lebih lanjut.' });
    }
    delete user.pass;
    return res.status(200).json({ success: true, data: user, role: 'contributor' });
  }

  // Cek di admins
  const admin = await db.collection('admins').findOne({ 
    username: username.toLowerCase(), 
    pass: password 
  });

  if (admin) {
    delete admin.pass;
    return res.status(200).json({ success: true, data: admin, role: 'admin' });
  }

  return res.status(401).json({ success: false, error: 'Invalid username or password' });
}
