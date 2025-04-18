import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import exportCsv from '../services/csv';
import { VocabItem } from '../services/types';
import VocabStore from '../services/vocab-store';
import './DeckDetailView.css';

const DeckDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<any>(null);
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/decks');
      return;
    }

    try {
      const deckData = VocabStore.getDeck(id);
      setDeck(deckData);

      // Extract vocab items from the deck
      let items: VocabItem[] = [];
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

  const handleWordChange = (index: number, value: string) => {
    const updatedItems = [...vocabItems];
    if (updatedItems[index].def && updatedItems[index].def[0]) {
      updatedItems[index].def[0].text = value;
      setVocabItems(updatedItems);

      // Update in store
      VocabStore.updateItem(id!, updatedItems[index], {
        def: updatedItems[index].def
      });
    }
  };

  const handleDefinitionChange = (index: number, value: string) => {
    const updatedItems = [...vocabItems];
    if (updatedItems[index].def && updatedItems[index].def[0] && updatedItems[index].def[0].tr) {
      updatedItems[index].def[0].tr[0].text = value;
      setVocabItems(updatedItems);

      // Update in store
      VocabStore.updateItem(id!, updatedItems[index], {
        def: updatedItems[index].def
      });
    }
  };

  const handleContextChange = (index: number, value: string) => {
    const updatedItems = [...vocabItems];
    updatedItems[index].context = value;
    setVocabItems(updatedItems);

    // Update in store
    VocabStore.updateItem(id!, updatedItems[index], {
      context: value
    });
  };

  const handleDeleteRow = (index: number) => {
    const itemToRemove = vocabItems[index];

    // Mark as removed in the store
    VocabStore.removeItem(id!, itemToRemove);

    // Remove from local state
    const updatedItems = vocabItems.filter((_, i) => i !== index);
    setVocabItems(updatedItems);
  };

  const handleExport = (type: string) => {
    if (vocabItems.length === 0) return;

    const csvContent = exportCsv(vocabItems, type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${deck.title || 'vocabulary'}_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          {/* <button className="action-button" onClick={handleFetchDefinitions}>Fetch definitions</button> */}
          <div className="export-buttons">
            <span>Download the deck as:</span>
            <button onClick={() => handleExport('basic')}>Anki Basic</button>
            <button onClick={() => handleExport('cloze')}>Anki Cloze</button>
            <button onClick={() => handleExport('plain')}>Plain CSV</button>
          </div>
        </div>
      </div>

      <table className="vocab-table">
        <thead>
          <tr>
            <th></th>
            <th>Word</th>
            <th>Definition</th>
            <th>Context</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {vocabItems.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                <input
                  type="text"
                  value={item.def && item.def[0] ? item.def[0].text : item.selection}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={
                    item.def &&
                      item.def[0] &&
                      item.def[0].tr ?
                      item.def[0].tr[0]?.text || '' : ''
                  }
                  onChange={(e) => handleDefinitionChange(index, e.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={item.context}
                  onChange={(e) => handleContextChange(index, e.target.value)}
                />
              </td>
              <td>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteRow(index)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeckDetailView;