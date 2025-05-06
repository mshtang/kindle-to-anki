import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  const handleWordChange = (index: number, value: string) => {
    const updatedItems = [...vocabItems];
    updatedItems[index].baseForm = value;
    setVocabItems(updatedItems);
    VocabStore.updateItem(id!, updatedItems[index], {
      baseForm: updatedItems[index].baseForm
    });
  };

  const handleDefinitionChange = (index: number, value: string) => {
    const updatedItems = [...vocabItems];
    updatedItems[index].def = value;
    setVocabItems(updatedItems);
    VocabStore.updateItem(id!, updatedItems[index], {
      def: updatedItems[index].def
    });
  };

  const handleContextChange = (index: number, value: string) => {
    const updatedItems = [...vocabItems];
    updatedItems[index].context = value;
    setVocabItems(updatedItems);
    VocabStore.updateItem(id!, updatedItems[index], {
      context: value
    });
  };

  const handleDeleteRow = (index: number) => {
    const itemToRemove = vocabItems[index];
    VocabStore.removeItem(id!, itemToRemove);
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
    link.setAttribute('download', `${deck?.title || 'vocabulary'}_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCellEdit = (index: number, field: string, value: string) => {
    if (field === 'word') {
      handleWordChange(index, value);
    } else if (field === 'definition') {
      handleDefinitionChange(index, value);
    } else if (field === 'context') {
      handleContextChange(index, value);
    }
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
          <div className="export-buttons">
            <span>Download the deck as:</span>
            <button onClick={() => handleExport('basic')}>Anki Basic</button>
            <button onClick={() => handleExport('cloze')}>Anki Cloze</button>
            <button onClick={() => handleExport('plain')}>Plain CSV</button>
          </div>
        </div>
      </div>

      <div className="deck-detail-table-container">
        <table className="deck-detail-table">
          <thead>
            <tr>
              <th className="index-column">#</th>
              <th className="word-column">Word</th>
              <th className='word-column'>Lemma</th>
              <th className="definition-column">Definition</th>
              <th className="context-column">Context</th>
              <th className="action-column"></th>
            </tr>
          </thead>
          <tbody>
            {vocabItems.map((item, index) => (
              <tr key={index}>
                <td className="index-cell">{index + 1}</td>
                <td className="word-cell">
                  <div>
                    {item.def && item.def[0] ? item.def[0].text : item.selection}
                  </div>
                </td>
                <td className="word-cell">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleCellEdit(index, 'word', e.target.textContent || '')}
                  >
                    {item.baseForm}
                  </div>
                </td>
                <td className="definition-cell">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleCellEdit(index, 'definition', e.target.textContent || '')}
                  >
                    {item.def && item.def[0] ? item.def[0] : ''}
                  </div>
                </td>
                <td className="context-cell">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleCellEdit(index, 'context', e.target.textContent || '')}
                  >
                    {item.context}
                  </div>
                </td>
                <td className="delete-cell">
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteRow(index)}
                    aria-label="Delete row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
      </table>
    </div>
    </div>
  );
};

export default DeckDetailView;