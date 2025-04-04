import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DeckList from '../components/DeckList/DeckList';
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
  const location = useLocation();
  const fileFromState = location.state?.vocabFile;

  useEffect(() => {
    if (!vocabFile && !fileFromState) {
      const savedBooks = KindleVocab.getBooks();
      if (savedBooks && savedBooks.length > 0) {
        setBooks(savedBooks);
        return;
      }
      navigate('/');
      return;
    }

    const processVocabFile = async () => {
      setLoading(true);
      try {
        const fileToProcess = vocabFile || fileFromState;
        const arrayBuffer = await fileToProcess.arrayBuffer();
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
  }, [vocabFile, fileFromState, navigate]);

  if (loading) {
    return <div className="loading">Loading vocabulary data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const handleDeckSelect = (book: Book) => {
    navigate(`/decks/${book.id}`);
  };

  return (
    <div className="deck-view">
      <h1>Decks</h1>
      <p>Your Kindle vocabulary:</p>
      <DeckList
        books={books}
        onDeckSelect={handleDeckSelect}
      />
    </div>
  );
};

export default DeckView;