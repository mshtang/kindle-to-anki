import React from 'react';
import { Book } from '../../services/types';
import DeckCard from '../DeckCard/DeckCard';
import './DeckList.css';

interface DeckListProps {
  books: Book[];
  onDeckSelect?: (book: Book) => void;
}

const DeckList: React.FC<DeckListProps> = ({ books, onDeckSelect }) => {
  if (!books || books.length === 0) {
    return <div className="no-decks">No vocabulary decks found</div>;
  }

  return (
    <div className="deck-grid">
      {books.map((book) => (
        <DeckCard 
          key={book.id} 
          book={book} 
          onClick={() => onDeckSelect && onDeckSelect(book)}
        />
      ))}
    </div>
  );
};

export default DeckList;