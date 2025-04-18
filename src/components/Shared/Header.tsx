import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import "./Header.css";

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
