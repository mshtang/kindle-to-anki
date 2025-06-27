import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TableRow from '../components/TableRow/TableRow';
import config from '../config';
import exportCsv from '../services/csv';
import { LlmDefinitionService } from '../services/llm';
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
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedApiUrl, setSelectedApiUrl] = useState<string>("");
  const [customApiUrl, setCustomApiUrl] = useState<string>("");
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [fetchingDefinitions, setFetchingDefinitions] = useState<boolean>(false);
  const llmService = React.useMemo(() => new LlmDefinitionService(), []);
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

      const settings = llmService.getSettings();
      setApiKey(settings.apiKey);

      // Find the matching predefined API or set to custom
      const matchingApi = config.llmApis.find(api => api.url === settings.apiUrl);
      if (matchingApi) {
        setSelectedApiUrl(matchingApi.url);
      } else if (settings.apiUrl) {
        setSelectedApiUrl('custom');
        setCustomApiUrl(settings.apiUrl);
      } else if (config.llmApis.length > 0) {
        setSelectedApiUrl(config.llmApis[0].url);
      }
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

  const handleApiSettingsChange = () => {
    // Determine the actual API URL based on selection
    const actualApiUrl = selectedApiUrl === 'custom' ? customApiUrl : selectedApiUrl;

    // Save the settings
    llmService.saveSettings({
      apiKey,
      apiUrl: actualApiUrl
    });

    setShowApiSettings(false);
  };

  const handleFetchDefinitions = async () => {
    if (!llmService.isConfigured()) {
      setShowApiSettings(true);
      return;
    }

    try {
      setFetchingDefinitions(true);
      const updatedItems = await llmService.fetchDefinitions(vocabItems);

      // Update the items in the state and store
      setVocabItems(updatedItems);

      // Update each item in the store
      updatedItems.forEach(item => {
        if (item.def) {
          VocabStore.updateItem(id!, item, { def: item.def });
        }
      });

      setFetchingDefinitions(false);
    } catch (error) {
      console.error('Error fetching definitions:', error);
      alert('Failed to fetch definitions. Please check your API settings.');
      setFetchingDefinitions(false);
    }
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
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/decks'); }}>Decks</a> &gt; {deck?.title || 'Vocabulary'}
        </div>
        <h1>{deck?.title || 'Vocabulary'}</h1>
        <div className="deck-info">
          {deck?.language && <span className="deck-language">Language: {deck.language}</span>}
          {vocabItems.length > 0 && <span className="word-count">{vocabItems.length} words</span>}
        </div>
        <div className="deck-actions">
          <div className="export-buttons">
            <span>Download as:</span>
            <button className="export-button anki-basic" onClick={() => handleExport('basic')}>Anki Basic</button>
            <button className="export-button anki-cloze" onClick={() => handleExport('cloze')}>Anki Cloze</button>
            <button className="export-button plain-csv" onClick={() => handleExport('plain')}>Plain CSV</button>
          </div>
          <div className="ai-definition-buttons">
            <button
              className="fetch-definitions-button"
              onClick={handleFetchDefinitions}
              disabled={fetchingDefinitions}
            >
              {fetchingDefinitions ? 'Fetching...' : 'Fetch AI Definitions'}
            </button>
            <button
              className="api-settings-button"
              onClick={() => setShowApiSettings(true)}
            >
              API Settings
            </button>
          </div>
        </div>
      </div>

      {showApiSettings && (
        <div className="api-settings-modal">
          <div className="api-settings-content">
            <h2>LLM API Settings</h2>
            <div className="form-group">
              <label htmlFor="api-select">Select API:</label>
              <select
                id="api-select"
                value={selectedApiUrl}
                onChange={(e) => {
                  setSelectedApiUrl(e.target.value);
                }}
              >
                {config.llmApis.map((api, index) => (
                  <option key={index} value={api.name === 'Custom' ? 'custom' : api.url}>
                    {api.name}{api.description ? ` - ${api.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedApiUrl === 'custom' && (
              <div className="form-group">
                <label htmlFor="custom-api-url">Custom API URL:</label>
                <input
                  type="text"
                  id="custom-api-url"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  placeholder="https://your-api-endpoint.com"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="api-key">API Key:</label>
              <input
                type="password"
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
            </div>

            <div className="modal-buttons">
              <button onClick={() => setShowApiSettings(false)}>Cancel</button>
              <button
                onClick={handleApiSettingsChange}
                disabled={!apiKey || (selectedApiUrl === 'custom' && !customApiUrl)}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

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