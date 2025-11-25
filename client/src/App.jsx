import { useState, useEffect } from 'react';
import axios from 'axios';
import CameraCapture from './components/CameraCapture'; 
import { registerUser, recognizeUser, fetchHistory } from './services/api';
import './index.css';

function App() {
  const [tab, setTab] = useState('register'); 
  const [name, setName] = useState('');
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [checkinData, setCheckinData] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' }); 
  const [historyList, setHistoryList] = useState([]); 

  const handleResetData = async () => {
      if (window.confirm("⚠️ CẢNH BÁO: Bạn có chắc muốn xóa SẠCH dữ liệu hệ thống?")) {
          try {
              await axios.delete('http://localhost:8000/reset-database/');
              alert("Đã reset hệ thống thành công!");
              window.location.reload();
          } catch (e) {
              alert("Lỗi: " + e.message);
          }
      }
  };

  const handleStartRegister = () => {
    if (!name.trim()) {
        setStatus({ type: 'error', msg: 'Vui lòng nhập tên của bạn!' });
        return;
    }
    setIsNameConfirmed(true); 
    setStatus({ type: '', msg: '' }); 
  };

  const loadHistory = async () => {
      try {
          const data = await fetchHistory();
          setHistoryList(data);
      } catch (error) {
          console.error("Failed to load history", error);
      }
  };

  useEffect(() => {
      if (tab === 'history') {
          loadHistory();
      }
  }, [tab]);

  const onRegister = async (capturedData) => {
    setStatus({ type: '', msg: '⏳ Đang xử lý và mã hóa vector...' });
    setIsProcessing(true);
    try {
      const res = await registerUser(name, capturedData);
      setStatus({ type: 'success', msg: res.message });
      setTimeout(() => {
          setName(''); setIsNameConfirmed(false); setStatus({ type: '', msg: '' });
      }, 3000);
    } catch (e) {
      const errorMsg = e.response && e.response.data.detail ? e.response.data.detail : e.message;
      setStatus({ type: 'error', msg: `❌ ${errorMsg}` });
    }
    setIsProcessing(false);
  };

  const onRecognize = async (blob) => {
    setIsProcessing(true);
    try {
      const res = await recognizeUser(blob);
      const capturedImgUrl = URL.createObjectURL(blob);
      
      if (res.match) {
        setCheckinData({
            success: true, 
            name: res.user, 
            time: res.time,
            image: capturedImgUrl
        });
      } else {
        const errorMsg = res.detail || "Không nhận diện được. Vui lòng thử lại.";
        setCheckinData({ 
            success: false, 
            image: capturedImgUrl,
            message: errorMsg 
        });
      }
    } catch (e) {
      const errorMsg = e.response && e.response.data.detail ? e.response.data.detail : "Lỗi kết nối Server!";
      setStatus({ type: 'error', msg: errorMsg });
      
      if (e.response && e.response.status === 400) {
          setCheckinData({
              success: false,
              image: URL.createObjectURL(blob),
              message: e.response.data.detail 
          });
      }
    }
    setIsProcessing(false);
  };

  return (
    <div className="app-container">
      <button onClick={handleResetData} style={{ position: 'absolute', top: 20, right: 20, opacity: 0.5, border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }} title="Reset Database">🗑️</button>

      <div className="main-card">
        <h1 className="header-title">Điểm danh</h1>
        
        <div className="nav-tabs">
          <button className={`nav-item ${tab === 'register' ? 'active' : ''}`} 
            onClick={() => { setTab('register'); setCheckinData(null); setIsNameConfirmed(false); }}>
            📝 Đăng ký
          </button>
          <button className={`nav-item ${tab === 'checkin' ? 'active' : ''}`} 
            onClick={() => { setTab('checkin'); setCheckinData(null); }}>
            📸 Điểm danh
          </button>
          <button className={`nav-item ${tab === 'history' ? 'active' : ''}`} 
            onClick={() => { setTab('history'); }}>
            🕒 Lịch sử
          </button>
        </div>

        {isProcessing && (
            <div style={{
                position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', zIndex: 100,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
            }}>
                <div style={{ width: '50px', height: '50px', border: '5px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '15px', fontWeight: '600', color: '#6366f1' }}>Đang xử lý dữ liệu AI...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )}

        <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            
            {tab === 'register' && (
                <>
                    {!isNameConfirmed ? (
                        <div style={{ textAlign: 'center', marginTop: '40px', animation: 'fadeIn 0.5s' }}>
                            <h3 style={{ marginBottom: '20px', color: '#475569' }}>Nhập thông tin nhân viên mới</h3>
                            <div className="input-group">
                                <input type="text" className="modern-input" placeholder="Họ và tên đầy đủ..." 
                                    value={name} onChange={e => setName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleStartRegister()}
                                />
                            </div>
                            <button onClick={handleStartRegister} className="btn-primary">
                                TIẾP TỤC &gt;
                            </button>
                            {status.msg && <p className={`status-message ${status.type === 'error' ? 'status-error' : ''}`}>{status.msg}</p>}
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.5s', width: '100%' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                Đăng ký cho: <b style={{ color: '#6366f1', fontSize: '1.2rem' }}>{name}</b>
                            </div>
                            <CameraCapture onCapture={onRegister} label="Lưu FaceID" />
                            {status.msg && <p className={`status-message ${status.type === 'success' ? 'status-success' : 'status-error'}`} style={{textAlign: 'center'}}>{status.msg}</p>}
                        </div>
                    )}
                </>
            )}

            {tab === 'checkin' && (
                <>
                    {!checkinData ? (
                        <div style={{ animation: 'fadeIn 0.5s', width: '100%' }}>
                            <p style={{ textAlign: 'center', marginBottom: '15px', color: '#64748b' }}>Vui lòng nhìn thẳng vào camera để điểm danh</p>
                            <CameraCapture onCapture={onRecognize} label="Điểm danh" />
                        </div>
                    ) : (
                        <div className={`id-card ${checkinData.success ? 'success' : 'error'}`}>
                            <div className="avatar-frame">
                                <img src={checkinData.image} alt="Captured" style={!checkinData.success ? { filter: 'grayscale(100%)' } : {}} />
                            </div>
                            
                            {checkinData.success ? (
                                <>
                                    <h2 style={{ color: '#1e293b', marginBottom: '5px' }}>{checkinData.name}</h2>
                                    <p style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '20px' }}>✅ ĐÃ ĐIỂM DANH</p>
                                    
                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Thời gian:</span>
                                            <span style={{ fontWeight: '600' }}>{checkinData.time}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>CẢNH BÁO</h2>
                                    <p style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        {checkinData.message || "Không nhận diện được khuôn mặt"}
                                    </p>
                                    <p style={{ color: '#64748b', marginTop: '5px', fontSize: '0.9rem' }}>Vui lòng thử lại.</p>
                                </>
                            )}

                            <button onClick={() => setCheckinData(null)} className="btn-secondary" style={{ marginTop: '25px' }}>
                                Quét lại
                            </button>
                        </div>
                    )}
                </>
            )}

            {tab === 'history' && (
                <div style={{ width: '100%', animation: 'fadeIn 0.5s', padding: '0 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ color: '#475569', margin: 0 }}>Lịch sử ra vào</h3>
                        <button onClick={loadHistory} className="btn-secondary" style={{ padding: '5px 15px', fontSize: '0.9rem' }}>Làm mới</button>
                    </div>
                    
                    <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.9rem', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0' }}>ID</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0' }}>Họ tên</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0' }}>Thời gian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyList.length > 0 ? (
                                    historyList.map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 15px', color: '#64748b' }}>#{item.id}</td>
                                            <td style={{ padding: '12px 15px', fontWeight: '600', color: '#334155' }}>{item.name}</td>
                                            <td style={{ padding: '12px 15px', color: '#334155' }}>{item.time}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu điểm danh.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default App;