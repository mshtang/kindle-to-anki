import React from "react";
import "./Logo.css";

const Logo: React.FC = () => {
  return (
    <div className="logo-container">
      <div className="logo-squares">
        <div className="logo-square"></div>
        <div className="logo-square"></div>
        <div className="logo-square"></div>
      </div>
      <span className="logo-text">Kindle Vocab Builder to Anki</span>
    </div>
  );
};

export default Logo;
