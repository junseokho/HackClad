import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Play from "./pages/Play";
import Characters from "./pages/Characters";
import Codex from "./pages/Codex";
import GameRoom from "./pages/GameRoom";
import "./index.css";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/play" element={<Play />} />
        <Route path="/characters" element={<Characters />} />
        <Route path="/codex" element={<Codex />} />
        <Route path="/game/:roomId" element={<GameRoom />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
