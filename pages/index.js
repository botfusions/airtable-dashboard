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

  const getStatusBg = (status) => {
    switch (status) {
      case 'Active': return '#064E3B';
      case 'Pending': return '#78350F';
      case 'Closed': return '#7F1D1D';
      default: return '#374151';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0F172A', 
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
          <p style={{ color: '#94A3B8' }}>Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F1F5F9' }}>
      {/* Header */}
      <div style={{ 
        background: '#1E293B', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', 
        borderBottom: '1px solid #334155' 
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
              color: '#F1F5F9',
              margin: 0,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              🚀 Müşteri Takip Dashboard
            </h1>
            <p style={{ 
              color: '#94A3B8', 
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
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
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
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            padding: '1.5rem',
            border: '1px solid #334155',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-4px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>Toplam Müşteri</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F1F5F9', margin: '8px 0 0 0' }}>
                  {stats.total}
                </p>
              </div>
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', 
                borderRadius: '12px',
                fontSize: '1.5rem'
              }}>
                📈
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            padding: '1.5rem',
            border: '1px solid #334155',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-4px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>Aktif</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10B981', margin: '8px 0 0 0' }}>
                  {stats.active}
                </p>
              </div>
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #10B981, #059669)', 
                borderRadius: '12px',
                fontSize: '1.5rem'
              }}>
                ✅
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            padding: '1.5rem',
            border: '1px solid #334155',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-4px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>Beklemede</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F59E0B', margin: '8px 0 0 0' }}>
                  {stats.pending}
                </p>
              </div>
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #F59E0B, #D97706)', 
                borderRadius: '12px',
                fontSize: '1.5rem'
              }}>
                ⏳
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            padding: '1.5rem',
            border: '1px solid #334155',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-4px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>Bu Hafta</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8B5CF6', margin: '8px 0 0 0' }}>
                  {stats.thisWeek}
                </p>
              </div>
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', 
                borderRadius: '12px',
                fontSize: '1.5rem'
              }}>
                📅
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', 
          borderRadius: '16px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', 
          padding: '1.5rem', 
          marginBottom: '2rem',
          border: '1px solid #334155'
        }}>
          <div style={{ position: 'relative' }}>
            <span style={{ 
              position: 'absolute', 
              left: '16px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              fontSize: '1.2rem'
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
                paddingLeft: '50px',
                paddingRight: '20px',
                paddingTop: '16px',
                paddingBottom: '16px',
                background: '#0F172A',
                border: '2px solid #334155',
                borderRadius: '12px',
                fontSize: '1rem',
                color: '#F1F5F9',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3B82F6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', 
          borderRadius: '16px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', 
          border: '1px solid #334155',
          overflow: 'hidden' 
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderBottom: '1px solid #475569' }}>
                <tr>
                  <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#F1F5F9' }}>
                    👤 Müşteri
                  </th>
                  <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#F1F5F9' }}>
                    📞 İletişim
                  </th>
                  <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#F1F5F9' }}>
                    📊 Durum
                  </th>
                  <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#F1F5F9' }}>
                    🎯 Kaynak
                  </th>
                  <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#F1F5F9' }}>
                    📅 Tarih
                  </th>
                  <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#F1F5F9' }}>
                    💰 Bütçe
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredNews.map((item, index) => (
                  <tr key={item.id} style={{ 
                    borderBottom: index !== filteredNews.length - 1 ? '1px solid #475569' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#F1F5F9', marginBottom: '4px', fontSize: '1rem' }}>
                          {item.Name || 'İsim Yok'}
                        </div>
                        {item['Email summary'] && (
                          <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                            {item['Email summary'].substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ marginBottom: '4px', color: '#94A3B8' }}>📧 {item.Email || '-'}</div>
                        <div style={{ color: '#94A3B8' }}>📱 {item.Number || '-'}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: getStatusBg(item.Status),
                        color: getStatusColor(item.Status),
                        border: `1px solid ${getStatusColor(item.Status)}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {item.Status || 'Belirsiz'}
                      </span>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.875rem', color: '#94A3B8' }}>
                      {item.Source || '-'}
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.875rem', color: '#94A3B8' }}>
                      {item['Date booked'] ? new Date(item['Date booked']).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.875rem', color: '#94A3B8' }}>
                      {item['Has the budget'] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredNews.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', borderRadius: '16px', marginTop: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F1F5F9', marginBottom: '0.5rem' }}>
              {searchTerm ? 'Sonuç bulunamadı' : 'Henüz müşteri bulunmuyor'}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '1rem' }}>
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
