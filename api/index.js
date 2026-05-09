import clientPromise from './_lib/mongodb.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url;
  const { pathname, query } = parseUrl(req.url);
  
  // ROUTING
  // Register
  if (pathname === '/api/register' && req.method === 'POST') {
    return handleRegister(req, res);
  }
  
  // Login
  if (pathname === '/api/login' && req.method === 'POST') {
    return handleLogin(req, res);
  }
  
  // Get all contributors
  if (pathname === '/api/contributors' && req.method === 'GET') {
    return handleGetContributors(req, res);
  }
  
  // Update user status (block/unblock)
  if (pathname === '/api/update-user-status' && req.method === 'POST') {
    return handleUpdateUserStatus(req, res);
  }
  
  // Delete user
  if (pathname === '/api/delete-user' && req.method === 'POST') {
    return handleDeleteUser(req, res);
  }
  
  // Admin setup
  if (pathname === '/api/admin-setup' && req.method === 'POST') {
    return handleAdminSetup(req, res);
  }
  
  // Get IDs by tier
  if (pathname === '/api/ids' && req.method === 'GET') {
    return handleGetIds(req, res);
  }
  
  // Add IDs
  if (pathname === '/api/ids' && req.method === 'POST') {
    return handleAddIds(req, res);
  }
  
  // Get user's IDs
  if (pathname === '/api/my-ids' && req.method === 'GET') {
    return handleMyIds(req, res);
  }
  
  // Mark sold
  if (pathname === '/api/sold' && req.method === 'POST') {
    return handleSold(req, res);
  }
  
  // Get sold IDs
  if (pathname === '/api/sold-ids' && req.method === 'GET') {
    return handleGetSoldIds(req, res);
  }
  
  // Update profile
  if (pathname === '/api/profile' && req.method === 'POST') {
    return handleUpdateProfile(req, res);
  }
  
  // Save file (admin)
  if (pathname === '/api/save-file' && req.method === 'POST') {
    return handleSaveFile(req, res);
  }
  
  // Update user's total (internal)
  if (pathname === '/api/update-total' && req.method === 'POST') {
    return handleUpdateTotal(req, res);
  }
  
  return res.status(404).json({ success: false, error: 'Endpoint not found' });
}

// ==================== HELPER ====================
function parseUrl(url) {
  const [pathname, queryString] = url.split('?');
  const query = {};
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      query[key] = decodeURIComponent(value || '');
    });
  }
  return { pathname, query };
}

// ==================== REGISTER ====================
async function handleRegister(req, res) {
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
    active: true,
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

// ==================== LOGIN ====================
async function handleLogin(req, res) {
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

// ==================== GET CONTRIBUTORS ====================
async function handleGetContributors(req, res) {
  const client = await clientPromise;
  const db = client.db('idglitxh');
  const contributors = db.collection('contributors');

  const all = await contributors.find({}).toArray();
  const safe = all.map(c => {
    delete c.pass;
    return c;
  });
  return res.status(200).json({ success: true, data: safe });
}

// ==================== UPDATE USER STATUS (BLOCK/UNBLOCK) ====================
async function handleUpdateUserStatus(req, res) {
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

// ==================== DELETE USER ====================
async function handleDeleteUser(req, res) {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');

  const result = await db.collection('contributors').deleteOne({ username: username });
  
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Hapus collection ids_username dan sold_username
  try { await db.collection(`ids_${username}`).drop(); } catch(e) {}
  try { await db.collection(`sold_${username}`).drop(); } catch(e) {}

  return res.status(200).json({ success: true, message: 'User deleted successfully' });
}

// ==================== ADMIN SETUP ====================
async function handleAdminSetup(req, res) {
  const { password } = req.body;

  const client = await clientPromise;
  const db = client.db('idglitxh');
  const admins = db.collection('admins');

  const existingAdmin = await admins.findOne({});
  
  if (existingAdmin) {
    if (existingAdmin.pass === password) {
      return res.status(200).json({ success: true, data: existingAdmin, isFirstTime: false });
    } else {
      return res.status(401).json({ success: false, error: 'Password salah' });
    }
  }

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

// ==================== GET IDS BY TIER ====================
async function handleGetIds(req, res) {
  const { tier } = req.query;
  
  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  const collectionMap = { low: 'ids_low', medium: 'ids_medium', high: 'ids_high', legend: 'ids_legend' };
  const collectionName = collectionMap[tier] || 'ids_low';
  
  const collection = db.collection(collectionName);
  const docs = await collection.find({}).toArray();
  const ids = docs.map(doc => doc.id);
  
  return res.status(200).json({ success: true, data: ids });
}

// ==================== ADD IDS ====================
async function handleAddIds(req, res) {
  const { username, tier, ids } = req.body;
  
  if (!username || !tier || !ids || !ids.length) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  const tierCollectionMap = { low: 'ids_low', medium: 'ids_medium', high: 'ids_high', legend: 'ids_legend' };
  const tierCollection = db.collection(tierCollectionMap[tier]);
  
  // Tambah ke tier collection
  for (const id of ids) {
    await tierCollection.updateOne(
      { id: id },
      { $set: { id: id, contributor: username, addedAt: new Date() } },
      { upsert: true }
    );
  }
  
  // Tambah ke collection milik contributor
  const userCollection = db.collection(`ids_${username}`);
  for (const id of ids) {
    await userCollection.updateOne(
      { id: id },
      { $set: { id: id, tier: tier, addedAt: new Date() } },
      { upsert: true }
    );
  }
  
  // Update total contributor
  await db.collection('contributors').updateOne(
    { username: username },
    { $inc: { total: ids.length } }
  );
  
  return res.status(200).json({ success: true, message: `Added ${ids.length} IDs` });
}

// ==================== GET USER'S IDS ====================
async function handleMyIds(req, res) {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');

  const userCollection = db.collection(`ids_${username}`);
  const ids = await userCollection.find({}).toArray();
  
  const soldCollection = db.collection(`sold_${username}`);
  const soldDocs = await soldCollection.find({}).toArray();
  const soldSet = new Set(soldDocs.map(d => d.id));

  const result = ids.map(doc => ({
    id: doc.id,
    tier: doc.tier,
    isSold: soldSet.has(doc.id)
  }));

  return res.status(200).json({ success: true, data: result });
}

// ==================== MARK SOLD ====================
async function handleSold(req, res) {
  const { username, soldIds, tier } = req.body;

  if (!username || !soldIds || !soldIds.length) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const client = await clientPromise;
  const db = client.db('idglitxh');

  // Tambah ke sold_ids global
  const globalSold = db.collection('sold_ids');
  for (const id of soldIds) {
    await globalSold.updateOne(
      { id: id },
      { $set: { id: id, seller: username, soldAt: new Date(), tier: tier } },
      { upsert: true }
    );
  }

  // Tambah ke collection sold milik contributor
  const userSold = db.collection(`sold_${username}`);
  for (const id of soldIds) {
    await userSold.updateOne(
      { id: id },
      { $set: { id: id, tier: tier, soldAt: new Date() } },
      { upsert: true }
    );
  }

  // Hapus dari tier collection jika tier ditentukan
  if (tier) {
    const tierCollectionMap = { low: 'ids_low', medium: 'ids_medium', high: 'ids_high', legend: 'ids_legend' };
    const tierCollection = db.collection(tierCollectionMap[tier]);
    for (const id of soldIds) {
      await tierCollection.deleteOne({ id: id });
    }
  }

  // Hapus dari collection ID contributor
  const userCollection = db.collection(`ids_${username}`);
  for (const id of soldIds) {
    await userCollection.deleteOne({ id: id });
  }

  // Update soldTotal contributor
  await db.collection('contributors').updateOne(
    { username: username },
    { $inc: { soldTotal: soldIds.length } }
  );

  return res.status(200).json({ success: true, message: `Marked ${soldIds.length} IDs as sold` });
}

// ==================== GET SOLD IDS ====================
async function handleGetSoldIds(req, res) {
  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  const sold = await db.collection('sold_ids').find({}).toArray();
  return res.status(200).json({ success: true, data: sold });
}

// ==================== UPDATE PROFILE ====================
async function handleUpdateProfile(req, res) {
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

// ==================== UPDATE TOTAL (internal) ====================
async function handleUpdateTotal(req, res) {
  const { username, total } = req.body;

  const client = await clientPromise;
  const db = client.db('idglitxh');
  
  await db.collection('contributors').updateOne(
    { username: username },
    { $set: { total: total } }
  );

  return res.status(200).json({ success: true });
}

// ==================== SAVE FILE (Admin) ====================
// Catatan: Ini hanya bekerja di environment tertentu dengan akses write
async function handleSaveFile(req, res) {
  const { filename, content } = req.body;
  
  // Simulasi save - di Vercel tidak bisa write ke filesystem
  // Untuk production, sebaiknya simpan ke GitHub via API
  return res.status(200).json({ success: true, message: 'File saved (simulated)' });
}
