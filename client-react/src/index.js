import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';// 지호 코드
import PaperListPage from './papers/PaperListPage'; // 예슬 코드
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PaperListPage />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
