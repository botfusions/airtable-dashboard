import axios from 'axios';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Airtable'dan verileri çek
      const response = await axios.get(airtableUrl, {
        headers: { 
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json(response.data.records);
      
    } else if (req.method === 'PATCH') {
      // Airtable'daki bir kaydı güncelle
      const { id, fields } = req.body;
      
      if (!id || !fields) {
        return res.status(400).json({ error: 'ID ve fields gerekli' });
      }
      
      const response = await axios.patch(`${airtableUrl}/${id}`, {
        fields
      }, {
        headers: { 
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json(response.data);
      
    } else if (req.method === 'POST') {
      // Yeni kayıt oluştur
      const { fields } = req.body;
      
      if (!fields) {
        return res.status(400).json({ error: 'Fields gerekli' });
      }
      
      const response = await axios.post(airtableUrl, {
        fields
      }, {
        headers: { 
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(201).json(response.data);
      
    } else if (req.method === 'DELETE') {
      // Kayıt sil
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID gerekli' });
      }
      
      const response = await axios.delete(`${airtableUrl}/${id}`, {
        headers: { 
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        }
      });
      
      return res.status(200).json(response.data);
    }
    
  } catch (error) {
    console.error('Airtable API Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'API hatası',
      details: error.response?.data || error.message 
    });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
