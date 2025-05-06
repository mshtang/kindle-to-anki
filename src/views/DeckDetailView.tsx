import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TableRow from '../components/TableRow/TableRow';
import exportCsv from '../services/csv';
import { BookDeck, VocabItem, Word } from '../services/types';
import VocabStore from '../services/vocab-store';
import './DeckDetailView.css';

const DeckDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<BookDeck | null>(null);
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/decks');
      return;
    }

    try {
      const deckData = VocabStore.getDeck(id) as BookDeck;
      setDeck(deckData);
      let items: Word[] = [];
      if ('words' in deckData) {
        items = deckData.words.filter((item: any) => !item._removed);
      }

      setVocabItems(items);
      setLoading(false);
    } catch (err) {
      console.error('Error loading deck:', err);
      setError('Failed to load vocabulary deck');
      setLoading(false);
    }
  }, [id, navigate]);

  const handleItemUpdate = useCallback((index: number, field: keyof Word, value: string) => {
    const updatedItems = [...vocabItems];
    const item = updatedItems[index];

    if (field === 'baseForm' || field === 'def' || field === 'context') {
      item[field] = value;
      setVocabItems(updatedItems);
      const updateData: Partial<Word> = { [field]: value };
      VocabStore.updateItem(id!, item, updateData);
    }
  }, [vocabItems, id]);

  const handleDeleteRow = useCallback((index: number) => {
    const itemToRemove = vocabItems[index];
    VocabStore.removeItem(id!, itemToRemove);
    const updatedItems = vocabItems.filter((_, i) => i !== index);
    setVocabItems(updatedItems);
  }, [vocabItems, id]);

  const handleExport = useCallback((type: string) => {
    if (vocabItems.length === 0) return;

    try {
      const csvContent = exportCsv(vocabItems, type);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${deck?.title || 'vocabulary'}_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export vocabulary as CSV');
    }
  }, [vocabItems, deck]);

  const handleCellEdit = useCallback((index: number, field: string, value: string) => {
    const fieldMap: Record<string, keyof Word> = {
      'lemma': 'baseForm',
      'definition': 'def',
      'context': 'context'
    };

    const actualField = fieldMap[field];
    if (actualField) {
      handleItemUpdate(index, actualField, value);
    }
  }, [handleItemUpdate]);

  const handleFetchDefinitions = () => {
    // This would be implemented to fetch definitions for words that don't have them
    alert('Fetching definitions functionality would be implemented here');
  };

  if (loading) {
    return <div className="loading">Loading vocabulary data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="deck-detail-view">
      <div className="deck-header">
        <div className="deck-navigation">
          <a href="#" onClick={() => navigate('/decks')}>Decks</a> &gt; {deck?.title || 'Vocabulary'}
        </div>
        <div className="deck-actions">
          <div className="export-buttons">
            <span>Download the deck as:</span>
            <button onClick={() => handleExport('basic')}>Anki Basic</button>
            <button onClick={() => handleExport('cloze')}>Anki Cloze</button>
            <button onClick={() => handleExport('plain')}>Plain CSV</button>
          </div>
        </div>
      </div>

      <div className="deck-detail-table-container">
        {vocabItems.length > 0 ? (
          <table className="deck-detail-table">
            <thead>
              <tr>
                <th className="index-column">#</th>
                <th className="word-column">Word</th>
                <th className="word-column">Lemma</th>
                <th className="definition-column">Definition</th>
                <th className="context-column">Context</th>
                <th className="action-column"></th>
              </tr>
            </thead>
            <tbody>
              {vocabItems.map((item, index) => (
                <TableRow
                  key={index}
                  item={item}
                  index={index}
                  onCellEdit={handleCellEdit}
                  onDeleteRow={handleDeleteRow}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-items">No vocabulary items found in this deck</div>
        )}
      </div>
    </div>
  );
};

export default DeckDetailView;