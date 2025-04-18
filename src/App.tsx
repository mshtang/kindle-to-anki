import React from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import Footer from "./components/Shared/Footer";
import Header from "./components/Shared/Header";
import DeckDetailView from "./views/DeckDetailView";
import DeckView from "./views/DeckView";
import HomeView from "./views/HomeView";

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/decks" element={<DeckView />} />
          <Route path="/decks/:id" element={<DeckDetailView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
