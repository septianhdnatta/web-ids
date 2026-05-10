import Catbox from 'catbox.moe';
import formidable from 'formidable';
import fs from 'fs';
import clientPromise from './_lib/mongodb.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Gunakan Catbox tanpa user hash (anonymous upload)
  const catbox = new Catbox.Catbox();
  
  // Parse form data
  const form = formidable({ 
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  });

  try {
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    const username = fields.username?.[0];

    if (!file || !username) {
      return res.status(400).json({ success: false, error: 'No file or username provided' });
    }

    console.log('Uploading file:', file.originalFilename, 'size:', file.size);

    // Upload ke Catbox menggunakan path file
    const response = await catbox.upload(file.filepath);
    
    console.log('Catbox response:', response);

    // Hapus file temporary
    fs.unlinkSync(file.filepath);

    // Update database dengan URL foto baru
    const client = await clientPromise;
    const db = client.db('idglitxh');
    await db.collection('contributors').updateOne(
      { username: username },
      { $set: { photo: response } }
    );

    return res.status(200).json({ 
      success: true, 
      url: response,
      message: 'Photo uploaded successfully!'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
