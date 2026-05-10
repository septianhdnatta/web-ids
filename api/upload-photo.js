import { Catbox } from 'node-catbox';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const catbox = new Catbox();
  
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

    // Upload ke Catbox
    const response = await catbox.uploadFile({
      path: file.filepath
    });

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
