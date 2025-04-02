import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KindleVocab from '../services/kindle-vocab';
import { Book } from '../services/types';
import './DeckView.css';

interface DeckViewProps {
  vocabFile?: File;
}

const DeckView: React.FC<DeckViewProps> = ({ vocabFile }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If no vocab file is provided, redirect back to home
    if (!vocabFile) {
      navigate('/');
      return;
    }

    const processVocabFile = async () => {
      setLoading(true);
      try {
        // Process the vocab.db file
        const arrayBuffer = await vocabFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // This would need to be implemented in the KindleService
        // For now, we'll just use mock data
        const kindleService = new (await import('../services/kindle')).default();
        await kindleService.init();
        kindleService.loadDb(uint8Array);
        
        const booksData = kindleService.queryBooks();
        if (booksData) {
          // Process each book to get its vocabulary
          const booksWithVocabs = booksData.map(book => {
            const vocabs = kindleService.queryVocabs(book.id);
            return { ...book, vocabs };
          });
          
          // Update KindleVocab service with the new books
          KindleVocab.setBooks(booksWithVocabs);
          setBooks(booksWithVocabs);
        } else {
          setError('No books found in the vocabulary database');
        }
      } catch (err) {
        console.error('Error processing vocab file:', err);
        setError('Failed to process the vocabulary database');
      } finally {
        setLoading(false);
      }
    };

    processVocabFile();
  }, [vocabFile, navigate]);

  if (loading) {
    return <div className="loading">Loading vocabulary data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="deck-view">
      <h1>Decks</h1>
      <p>Your Kindle vocabulary:</p>
      
      <div className="deck-grid">
        {books.map((book) => (
          <div key={book.id} className="deck-card">
            <div className="deck-title">{book.title}</div>
            <div className="word-count">{book.count} words</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeckView;