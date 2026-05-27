/* ============================================================
   WorkBoard Pro – Express Static Server
   Railway 배포용 정적 파일 서빙 서버
   ============================================================ */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 서빙
app.use(express.static(path.join(__dirname), {
  extensions: ['html', 'css', 'js'],
  maxAge: '1h'
}));

// SPA fallback – 모든 경로를 index.html로
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ WorkBoard Pro running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});
