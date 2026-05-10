// Di handleRegister, setelah insertOne, langsung return data user
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

  // KEMBALIKAN DATA USER (TANPA PASSWORD)
  const { pass, ...userWithoutPass } = newContributor;
  
  return res.status(200).json({ 
    success: true, 
    data: userWithoutPass,
    message: 'Registration successful! Redirecting to dashboard...'
  });
}
