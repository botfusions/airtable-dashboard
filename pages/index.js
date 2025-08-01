import { useEffect, useState } from 'react';

export default function Home() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    thisWeek: 0
  });

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
        
        // İstatistikleri hesapla
        setStats({
          total: formattedData.length,
          active: formattedData.filter(item => item.Status === 'Active').length,
          pending: formattedData.filter(item => item.Status === 'Pending').length,
          thisWeek: formattedData.filter(item => {
            const itemDate = new Date(item['Date booked']);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return itemDate >= weekAgo;
          }).length
        });
      }
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews = news.filter(item =>
    Object.values(item).some(value =>
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10B981';
      case 'Pending': return '#F59E0B';
      case 'Closed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#F9FAFB', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '2rem', 
            marginBottom: '1rem',
            animation: 'spin 1s linear infinite'
          }}>🔄</div>
          <p style={{ color: '#6B7280' }}>Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div style={{ 
        background: 'white', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
        borderBottom: '1px solid #E5E7EB' 
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          padding: '0 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '80px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '1.875rem', 
              fontWeight: 'bold', 
              color: '#111827',
              margin: 0 
            }}>
              Müşteri Takip Dashboard
            </h1>
            <p style={{ 
              color: '#6B7280', 
              margin: '4px 0 0 0',
              fontSize: '0.875rem'
            }}>
              Airtable bağlantılı canlı veri yönetimi
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🔄 Yenile
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Toplam Müşteri</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '4px 0 0 0' }}>
                  {stats.total}
                </p>
              </div>
              <div style={{ 
                padding: '12px', 
                background: '#DBEAFE', 
                borderRadius: '8px' 
              }}>
                📈
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Aktif</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                  {stats.active}
                </p>
              </div>
              <div style={{ 
                padding: '12px', 
                background: '#D1FAE5', 
                borderRadius: '8px' 
              }}>
                👁️
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Beklemede</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#D97706', margin: '4px 0 0 0' }}>
                  {stats.pending}
                </p>
              </div>
              <div style={{ 
                padding: '12px', 
                background: '#FEF3C7', 
                borderRadius: '8px' 
              }}>
                ⏳
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Bu Hafta</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#7C3AED', margin: '4px 0 0 0' }}>
                  {stats.thisWeek}
                </p>
              </div>
              <div style={{ 
                padding: '12px', 
                background: '#EDE9FE', 
                borderRadius: '8px' 
              }}>
                📅
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          padding: '1.5rem', 
          marginBottom: '2rem',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ position: 'relative' }}>
            <span style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#9CA3AF' 
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Müşteri ara (isim, email, telefon...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '16px',
                paddingTop: '12px',
                paddingBottom: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          border: '1px solid #E5E7EB',
          overflow: 'hidden' 
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    Müşteri
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    İletişim
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    Durum
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    Kaynak
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    Tarih
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    Bütçe
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredNews.map((item, index) => (
                  <tr key={item.id} style={{ 
                    borderBottom: index !== filteredNews.length - 1 ? '1px solid #F3F4F6' : 'none'
                  }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                          {item.Name || 'İsim Yok'}
                        </div>
                        {item['Email summary'] && (
                          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                            {item['Email summary'].substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ marginBottom: '2px' }}>📧 {item.Email || '-'}</div>
                        <div>📱 {item.Number || '-'}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: item.Status === 'Active' ? '#D1FAE5' : '#FEF3C7',
                        color: getStatusColor(item.Status)
                      }}>
                        {item.Status || 'Belirsiz'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>
                      {item.Source || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                      {item['Date booked'] ? new Date(item['Date booked']).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>
                      {item['Has the budget'] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredNews.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
              {searchTerm ? 'Sonuç bulunamadı' : 'Henüz müşteri bulunmuyor'}
            </h3>
            <p style={{ color: '#6B7280' }}>
              {searchTerm 
                ? 'Arama kriterlerinizi değiştirip tekrar deneyin.' 
                : 'Airtable tablonuzda veri oluşturun.'
              }
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
