import { useEffect, useState } from 'react';

export default function Home() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/airtable');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const formattedData = data.map(record => ({
          id: record.id,
          ...record.fields
        }));
        setNews(formattedData);
      }
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredNews = news.filter(item =>
    Object.values(item).some(value =>
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>Dashboard Yükleniyor...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1>Müşteri Takip Dashboard</h1>
        <p>Airtable bağlantılı canlı veri yönetimi</p>
        
        <button 
          onClick={fetchData}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          🔄 Yenile
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Müşteri ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '5px'
          }}
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '20px' 
      }}>
        {filteredNews.length > 0 ? (
          filteredNews.map((item) => (
            <div key={item.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#f9f9f9'
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>
                👤 {item.Name || 'İsim Yok'}
              </h3>
              
              <div style={{ marginTop: '15px' }}>
                <strong>📧 Email:</strong> {item.Email || '-'}
              </div>
              
              <div>
                <strong>📱 Telefon:</strong> {item.Number || '-'}
              </div>
              
              <div>
                <strong>📊 Durum:</strong> 
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginLeft: '5px',
                  backgroundColor: item.Status === 'Active' ? '#d4edda' : '#fff3cd',
                  color: item.Status === 'Active' ? '#155724' : '#856404'
                }}>
                  {item.Status || 'Belirsiz'}
                </span>
              </div>
              
              <div>
                <strong>🎯 Kaynak:</strong> {item.Source || '-'}
              </div>
              
              <div>
                <strong>📅 Rezervasyon:</strong> {item['Date booked'] || '-'}
              </div>
              
              <div>
                <strong>💰 Bütçe:</strong> {item['Has the budget'] || '-'}
              </div>

              {item.Q1 && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                  <strong>Q1:</strong> {item.Q1}
                </div>
              )}

              {item.Q2 && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                  <strong>Q2:</strong> {item.Q2}
                </div>
              )}

              {item.Q3 && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                  <strong>Q3:</strong> {item.Q3}
                </div>
              )}

              {item['Email summary'] && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                  <strong>📝 Özet:</strong> {item['Email summary']}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3>Henüz müşteri bulunmuyor</h3>
            <p>Airtable tablonuzda veri oluşturun</p>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '30px', textAlign: 'center', color: '#666' }}>
        <p>Toplam {news.length} müşteri • Airtable Dashboard</p>
      </div>
    </div>
  );
}
