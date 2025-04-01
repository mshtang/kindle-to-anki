import React from "react";
import "./App.css";
import DropZone from "./components/DropZone";
import Footer from "./components/Footer";
import Header from "./components/Header";

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <DropZone />
      </main>
      <Footer />
    </div>
  );
}

export default App;
