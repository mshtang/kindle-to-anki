import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";
import Logo from "./Logo";

const Header: React.FC = () => {
  return (
    <header className="header">
      <Link to="/">
        <Logo />
      </Link>
    </header>
  );
};

export default Header;
