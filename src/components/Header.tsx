import React from "react";
import "./Header.css";
import Logo from "./Logo";

const Header: React.FC = () => {
  return (
    <header className="header">
      <Logo />
      <nav className="navigation">
        <a href="#" className="nav-link">
          Flashcards
        </a>
        <a href="#" className="nav-link">
          Kindle
        </a>
      </nav>
    </header>
  );
};

export default Header;
