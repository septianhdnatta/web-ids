import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Manual parsing URL (TIDAK menggunakan parseUrl)
  const urlParts = req.url.split('?');
  const pathname = urlParts[0];
  
  // ROUTING (Semua endpoint kamu ada di sini)
  if (pathname === '/api/register' && req.method === 'POST') return handleRegister(req, res);
  if (pathname === '/api/login' && req.method === 'POST') return handleLogin(req, res);
  if (pathname === '/api/contributors' && req.method === 'GET') return handleGetContributors(req, res);
  if (pathname === '/api/update-user-status' && req.method === 'POST') return handleUpdateUserStatus(req, res);
  if (pathname === '/api/delete-user' && req.method === 'POST') return handleDeleteUser(req, res);
  if (pathname === '/api/admin-setup' && req.method === 'POST') return handleAdminSetup(req, res);
  if (pathname === '/api/ids' && req.method === 'GET') return handleGetIds(req, res);
  if (pathname === '/api/ids' && req.method === 'POST') return handleAddIds(req, res);
  if (pathname === '/api/my-ids' && req.method === 'GET') return handleMyIds(req, res);
  if (pathname === '/api/sold' && req.method === 'POST') return handleSold(req, res);
  if (pathname === '/api/sold-ids' && req.method === 'GET') return handleGetSoldIds(req, res);
  if (pathname === '/api/update-total' && req.method === 'POST') return handleUpdateTotal(req, res);
  if (pathname === '/api/profile' && req.method === 'POST') return handleUpdateProfile(req, res);
  if (pathname === '/api/reset-all-ids' && req.method === 'POST') return handleResetAllIds(req, res);
  
  return res.status(404).json({ success: false, error: 'Endpoint not found' });
}

// ==================== SEMUA HANDLER FUNGSI DI SINI ====================
// (Masukkan semua fungsi handleRegister, handleLogin, handleGetContributors, 
//  handleMyIds, handleSold, dll. yang sudah kita buat sebelumnya di sini.)
// ... kode handler functions selengkapnya ...

// ==================== REGISTER ====================
async function handleRegister(req, res) {
  const { username, name, wa, password } = req.body;
  
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
    photo: '',
    cover: '',
    qris: '',
    bio: '',
    wa: wa,
    pass: password,
    role: 'CB',
    verified: false,
    total: 0,
    soldTotal: 0,
    active: true,
    joined: new Date().toISOString().split('T')[0],
    createdAt: new Date()
  };

  await contributors.insertOne(newContributor);
  await db.createCollection(`ids_${username.toLowerCase()}`);
  await db.createCollection(`sold_${username.toLowerCase()}`);

  delete newContributor.pass;
  return res.status(200).json({ success: true, data: newContributor, message: 'Registration successful!' });
}

// ==================== LOGIN ====================
async function handleLogin(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Missing username or password' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  let user = await db.collection('contributors').findOne({ username: username.toLowerCase(), pass: password });
  if (user) {
    if (user.active === false) {
      return res.status(403).json({ success: false, error: 'Akun Anda telah diblokir oleh admin. Hubungi admin untuk informasi lebih lanjut.' });
    }
    delete user.pass;
    return res.status(200).json({ success: true, data: user, role: user.role || 'CB' });
  }

  const admin = await db.collection('admins').findOne({ username: username.toLowerCase(), pass: password });
  if (admin) {
    delete admin.pass;
    return res.status(200).json({ success: true, data: admin, role: 'ADMIN' });
  }

  return res.status(401).json({ success: false, error: 'Invalid username or password' });
}

// ==================== GET CONTRIBUTORS ====================
async function handleGetContributors(req, res) {
  const client = await clientPromise;
  const db = client.db('idglitxh');
  const contributors = db.collection('contributors');

  const all = await contributors.find({}).toArray();
  const safe = all.map(c => { delete c.pass; return c; });
  return res.status(200).json({ success: true, data: safe });
}

// ==================== UPDATE USER STATUS ====================
async function handleUpdateUserStatus(req, res) {
  const { username, active } = req.body;
  if (!username) return res.status(400).json({ success: false, error: 'Username required' });

  const client = await clientPromise;
  const db = client.db('idglitxh');
  const result = await db.collection('contributors').updateOne({ username }, { $set: { active } });

  if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'User not found' });
  return res.status(200).json({ success: true, message: `User ${active ? 'unblocked' : 'blocked'}` });
}

// ==================== DELETE USER (LENGKAP DENGAN SEMUA ID) ====================
async function handleDeleteUser(req, res) {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: 'Username required' });

  const client = await clientPromise;
  const db = client.db('idglitxh');

  try {
    // 1. Ambil semua ID milik user ini dari ids_username
    const userIdsCollection = db.collection(`ids_${username}`);
    const userIDs = await userIdsCollection.find({}).toArray();
    const idValues = userIDs.map(doc => doc.id);

    // 2. Hapus ID dari semua tier collections
    const tierCollections = ['ids_low', 'ids_medium', 'ids_high', 'ids_legend'];
    for (const tierCol of tierCollections) {
      const collection = db.collection(tierCol);
      for (const id of idValues) {
        await collection.deleteOne({ id: id });
      }
    }

    // 3. Hapus dari sold_ids global
    const soldGlobal = db.collection('sold_ids');
    for (const id of idValues) {
      await soldGlobal.deleteOne({ id: id });
    }

    // 4. Hapus collection ids_username dan sold_username
    try { await db.collection(`ids_${username}`).drop(); } catch(e) {}
    try { await db.collection(`sold_${username}`).drop(); } catch(e) {}

    // 5. Hapus contributor dari contributors
    const result = await db.collection('contributors').deleteOne({ username });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({ success: true, message: `User ${username} and all their IDs deleted successfully` });
  } catch (error) {
    console.error('Error in delete user:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ==================== ADMIN SETUP ====================
async function handleAdminSetup(req, res) {
  const { password } = req.body;
  const client = await clientPromise;
  const db = client.db('idglitxh');
  const admins = db.collection('admins');

  const existingAdmin = await admins.findOne({});
  if (existingAdmin) {
    if (existingAdmin.pass === password) return res.status(200).json({ success: true, data: existingAdmin, isFirstTime: false });
    return res.status(401).json({ success: false, error: 'Password salah' });
  }

  const newAdmin = { username: 'admin', name: 'Administrator', pass: password, role: 'ADMIN', createdAt: new Date() };
  await admins.insertOne(newAdmin);
  return res.status(200).json({ success: true, data: newAdmin, isFirstTime: true });
}

// ==================== GET IDS BY TIER ====================
async function handleGetIds(req, res) {
  const { tier } = req.query;
  const client = await clientPromise;
  const db = client.db('idglitxh');
  const collectionMap = { low: 'ids_low', medium: 'ids_medium', high: 'ids_high', legend: 'ids_legend' };
  const collection = db.collection(collectionMap[tier] || 'ids_low');
  const docs = await collection.find({}).toArray();
  return res.status(200).json({ success: true, data: docs.map(d => d.id) });
}

// ==================== ADD IDS ====================
async function handleAddIds(req, res) {
  const { username, tier, ids } = req.body;
  if (!username || !tier || !ids || !ids.length) return res.status(400).json({ success: false, error: 'Missing required fields' });

  const client = await clientPromise;
  const db = client.db('idglitxh');
  const tierMap = { low: 'ids_low', medium: 'ids_medium', high: 'ids_high', legend: 'ids_legend' };
  const tierCollection = db.collection(tierMap[tier]);

  for (const id of ids) {
    await tierCollection.updateOne({ id }, { $set: { id, contributor: username, addedAt: new Date() } }, { upsert: true });
    await db.collection(`ids_${username}`).updateOne({ id }, { $set: { id, tier, addedAt: new Date() } }, { upsert: true });
  }
  await db.collection('contributors').updateOne({ username }, { $inc: { total: ids.length } });
  return res.status(200).json({ success: true, message: `Added ${ids.length} IDs` });
}

// ==================== GET USER'S IDS (DARI ids_username DAN sold_username) ====================
async function handleMyIds(req, res) {
  const { username } = req.query;
  if (!username) return res.status(400).json({ success: false, error: 'Username required' });

  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  try {
    // Ambil ID aktif dari ids_username
    const userCollection = db.collection(`ids_${username}`);
    const activeIds = await userCollection.find({}).toArray();
    
    // Ambil ID sold dari sold_username
    const soldCollection = db.collection(`sold_${username}`);
    const soldIds = await soldCollection.find({}).toArray();
    
    // Gabungkan: ID aktif (isSold: false) + ID sold (isSold: true)
    const result = [
      ...activeIds.map(doc => ({
        id: doc.id,
        tier: doc.tier || 'unknown',
        isSold: false
      })),
      ...soldIds.map(doc => ({
        id: doc.id,
        tier: doc.tier || 'unknown',
        isSold: true
      }))
    ];
    
    // Urutkan berdasarkan ID (opsional)
    result.sort((a, b) => a.id.localeCompare(b.id));
    
    console.log(`[my-ids] User: ${username}, Active: ${activeIds.length}, Sold: ${soldIds.length}, Total: ${result.length}`);
    
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error in handleMyIds:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ==================== MARK SOLD ====================
async function handleSold(req, res) {
  const { username, soldIds, tier } = req.body;
  if (!username || !soldIds || !soldIds.length) return res.status(400).json({ success: false, error: 'Missing required fields' });

  const client = await clientPromise;
  const db = client.db('idglitxh');

  try {
    for (const id of soldIds) {
      // 1. Simpan ke sold_ids global
      await db.collection('sold_ids').updateOne(
        { id: id },
        { $set: { id: id, seller: username, soldAt: new Date(), tier: tier } },
        { upsert: true }
      );
      
      // 2. Simpan ke collection sold_username
      await db.collection(`sold_${username}`).updateOne(
        { id: id },
        { $set: { id: id, tier: tier, soldAt: new Date() } },
        { upsert: true }
      );
      
      // 3. HAPUS dari collection ids_username (pindahkan ke sold)
      await db.collection(`ids_${username}`).deleteOne({ id: id });
    }

    // 4. Hapus dari tier collection jika tier ditentukan
    if (tier && tier !== '') {
      const tierMap = { low: 'ids_low', medium: 'ids_medium', high: 'ids_high', legend: 'ids_legend' };
      const tierCollection = db.collection(tierMap[tier]);
      for (const id of soldIds) {
        await tierCollection.deleteOne({ id: id });
      }
    }

    // 5. Update soldTotal contributor
    await db.collection('contributors').updateOne(
      { username: username },
      { $inc: { soldTotal: soldIds.length } }
    );

    return res.status(200).json({ success: true, message: `Marked ${soldIds.length} IDs as sold` });
  } catch (error) {
    console.error('Error in handleSold:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ==================== GET SOLD IDS (GLOBAL) ====================
async function handleGetSoldIds(req, res) {
  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  try {
    const sold = await db.collection('sold_ids').find({}).toArray();
    return res.status(200).json({ success: true, data: sold });
  } catch (error) {
    console.error('Error in handleGetSoldIds:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ==================== UPDATE TOTAL ====================
async function handleUpdateTotal(req, res) {
  const { username, total } = req.body;
  const client = await clientPromise;
  const db = client.db('idglitxh');
  await db.collection('contributors').updateOne({ username }, { $set: { total } });
  return res.status(200).json({ success: true });
}

// ==================== UPDATE PROFILE ====================
async function handleUpdateProfile(req, res) {
  const { username, name, photo, cover, qris, verified, bio, wa } = req.body;

  if (!username) return res.status(400).json({ success: false, error: 'Username required' });

  const client = await clientPromise;
  const db = client.db('idglitxh');

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (photo !== undefined) updateData.photo = photo;
  if (cover !== undefined) updateData.cover = cover;
  if (qris !== undefined) updateData.qris = qris;
  if (verified !== undefined) updateData.verified = verified;
  if (bio !== undefined) updateData.bio = bio;
  if (wa !== undefined) updateData.wa = wa;

  await db.collection('contributors').updateOne({ username }, { $set: updateData });

  return res.status(200).json({ success: true, message: 'Profile updated' });
}

// ==================== RESET ALL IDS ====================
async function handleResetAllIds(req, res) {
  const client = await clientPromise;
  const db = client.db('idglitxh');

  try {
    let deletedCount = 0;

    const tierCollections = ['ids_low', 'ids_medium', 'ids_high', 'ids_legend'];
    for (const collectionName of tierCollections) {
      const result = await db.collection(collectionName).deleteMany({});
      deletedCount += result.deletedCount;
    }

    const soldResult = await db.collection('sold_ids').deleteMany({});
    deletedCount += soldResult.deletedCount;

    const contributors = await db.collection('contributors').find({}).toArray();

    for (const con of contributors) {
      try {
        const idsResult = await db.collection(`ids_${con.username}`).deleteMany({});
        deletedCount += idsResult.deletedCount;
        const soldResult2 = await db.collection(`sold_${con.username}`).deleteMany({});
        deletedCount += soldResult2.deletedCount;
      } catch(e) {}
    }

    await db.collection('contributors').updateMany({}, { $set: { total: 0, soldTotal: 0 } });

    return res.status(200).json({ success: true, message: 'All IDs reset', deletedCount });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
