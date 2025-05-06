import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";
import Logo from "./Logo";

const Header: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const isDeckView = path.startsWith('/decks');
  const isDeckDetailView = path.match(/^\/deck\/[^/]+$/);
  const deckTitle = location.state?.deckTitle || 'Deck Details';

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo-link">
          <Logo />
        </Link>

        <div className="breadcrumb-navigation">
          {isDeckView && (
            <>
              <span className="breadcrumb-separator">&gt;</span>
              <Link to="/decks" className="breadcrumb-link">Decks</Link>
            </>
          )}

          {isDeckDetailView && (
            <>
              <span className="breadcrumb-separator">&gt;</span>
              <Link to="/decks" className="breadcrumb-link">Decks</Link>
              <span className="breadcrumb-separator">&gt;</span>
              <span className="breadcrumb-current">{deckTitle}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
