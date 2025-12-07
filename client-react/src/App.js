import React from "react";
import { useAuth } from "./context/AuthContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";


import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import QuotePage from "./pages/QuotePage";

function App() {
  const { token, loading } = useAuth();

  if (loading) return <div style={{ color: "white" }}>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {!token ? (
          <>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </>
        ) : (
          <>
            <Route path="/" element={<QuotePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
