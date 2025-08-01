import { useEffect, useState } from 'react';

// Basit ikon componentleri - lucide-react yerine
const Search = () => <span>🔍</span>;
const RefreshCw = ({ className }) => <span className={className}>🔄</span>;
const Eye = ({ className }) => <span className={className}>👁️</span>;
const Edit2 = ({ className }) => <span className={className}>✏️</span>;
const ExternalLink = ({ className }) => <span className={className}>🔗</span>;
const Calendar = ({ className }) => <span className={className}>📅</span>;
const Tag = ({ className }) => <span className={className}>🏷️</span>;
const User = ({ className }) => <span className={className}>👤</span>;
const TrendingUp = ({ className }) => <span className={className}>📈</span>;
const Plus = ({ className }) => <span className={className}>➕</span>;
const Save = ({ className }) => <span className={className}>💾</span>;
const X = ({ className }) => <span className={className}>❌</span>;

export default function Home() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    Başlık: '',
    Özet: '',
    Yazar: '',
    Kategori: '',
    Durum: 'Taslak',
    URL: '',
    Etiketler: []
  });
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
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
        
        setStats({
          total: formattedData.length,
          published: formattedData.filter(item => item.Durum === 'Yayınlandı').length,
          draft: formattedData.filter(item => item.Durum === 'Taslak').length,
          thisWeek: formattedData.filter(item => {
            const itemDate = new Date(item.Tarih);
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

  const handleCellEdit = (id, field, currentValue) => {
    setEditingId(`${id}-${field}`);
    setEditData({ id, field, value: currentValue });
  };

  const response = await fetch('/api/airtable', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: editData.id,
    fields: { [editData.field]: editData.value }
  })
});
      
      if (response.ok) {
        setNews(prev => prev.map(item => 
          item.id === editData.id 
            ? { ...item, [editData.field]: editData.value }
            : item
        ));
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
    }
    
    setEditingId(null);
    setEditData({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const addNewRecord = async () => {
    try {
      const response = await fetch('/api/airtable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            ...newRecord,
            Tarih: new Date().toISOString().split('T')[0],
            Görüntülenme: 0
          }
        })
      });
      
      if (response.ok) {
        await fetchData();
        setShowAddForm(false);
        setNewRecord({
          Başlık: '',
          Özet: '',
          Yazar: '',
          Kategori: '',
          Durum: 'Taslak',
          URL: '',
          Etiketler: []
        });
      }
    } catch (error) {
      console.error('Ekleme hatası:', error);
    }
  };

  const filteredNews = news.filter(item =>
    Object.values(item).some(value =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Yayınlandı': return 'bg-green-100 text-green-800 border-green-200';
      case 'Taslak': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'İnceleme': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Teknoloji': 'bg-purple-100 text-purple-800',
      'Enerji': 'bg-green-100 text-green-800',
      'Pazarlama': 'bg-blue-100 text-blue-800',
      'Ekonomi': 'bg-orange-100 text-orange-800',
      'Sağlık': 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Haberler Dashboard</h1>
              <p className="text-gray-600 mt-1">Airtable bağlantılı canlı veri yönetimi</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Yeni Haber
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Haber</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Yayınlanan</p>
                <p className="text-3xl font-bold text-green-600">{stats.published}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taslak</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.draft}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Edit2 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bu Hafta</p>
                <p className="text-3xl font-bold text-purple-600">{stats.thisWeek}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Haber ara (başlık, yazar, kategori...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Yeni Haber Ekle</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                  <input
                    type="text"
                    value={newRecord.Başlık}
                    onChange={(e) => setNewRecord({...newRecord, Başlık: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yazar</label>
                  <input
                    type="text"
                    value={newRecord.Yazar}
                    onChange={(e) => setNewRecord({...newRecord, Yazar: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={newRecord.Kategori}
                    onChange={(e) => setNewRecord({...newRecord, Kategori: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Kategori Seçin</option>
                    <option value="Teknoloji">Teknoloji</option>
                    <option value="Enerji">Enerji</option>
                    <option value="Pazarlama">Pazarlama</option>
                    <option value="Ekonomi">Ekonomi</option>
                    <option value="Sağlık">Sağlık</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                  <select
                    value={newRecord.Durum}
                    onChange={(e) => setNewRecord({...newRecord, Durum: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Taslak">Taslak</option>
                    <option value="İnceleme">İnceleme</option>
                    <option value="Yayınlandı">Yayınlandı</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                  <input
                    type="url"
                    value={newRecord.URL}
                    onChange={(e) => setNewRecord({...newRecord, URL: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Özet</label>
                  <textarea
                    value={newRecord.Özet}
                    onChange={(e) => setNewRecord({...newRecord, Özet: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={addNewRecord}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Başlık</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Yazar</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Kategori</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Durum</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tarih</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Görüntülenme</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredNews.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        {editingId === `${item.id}-Başlık` ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editData.value}
                              onChange={(e) => setEditData({...editData, value: e.target.value})}
                              className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                              onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                            />
                            <button onClick={saveEdit} className="text-green-600 hover:text-green-800">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="text-red-600 hover:text-red-800">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <h3 
                            className="font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600"
                            onClick={() => handleCellEdit(item.id, 'Başlık', item.Başlık)}
                          >
                            {item.Başlık}
                          </h3>
                        )}
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.Özet}
                        </p>
                        
                        {item.Etiketler && Array.isArray(item.Etiketler) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.Etiketler.map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">{item.Yazar}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.Kategori)}`}>
                        {item.Kategori}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.Durum)}`}>
                        {item.Durum}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.Tarih ? new Date(item.Tarih).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {item.Görüntülenme?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.URL && (
                          
                            href={item.URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Haberi Görüntüle"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleCellEdit(item.id, 'Başlık', item.Başlık)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredNews.length === 0 && !loading && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Sonuç bulunamadı' : 'Henüz haber bulunmuyor'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Arama kriterlerinizi değiştirip tekrar deneyin.' 
                : 'İlk haberinizi eklemek için "Yeni Haber" butonunu kullanın.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
