import React from 'react';
import { Book } from '../../services/types';
import './DeckCard.css';

interface DeckCardProps {
  book: Book;
  onClick?: () => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ book, onClick }) => {
  return (
    <div className="deck-card" onClick={onClick}>
      <div className="deck-title">{book.title}</div>
      {book.authors && <div className="deck-author">{book.authors}</div>}
      <div className="deck-details">
        {book.language && (
          <span className="deck-language">{book.language}</span>
        )}
        {book.count > 0 && (
          <span className="word-count">{book.count} words</span>
        )}
      </div>
    </div>
  );
};

export default DeckCard;