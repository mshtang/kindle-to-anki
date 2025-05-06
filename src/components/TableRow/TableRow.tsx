import React from 'react';
import { VocabItem } from '../../services/types';
import './TableRow.css';

interface TableRowProps {
  item: VocabItem;
  index: number;
  onCellEdit: (index: number, field: string, value: string) => void;
  onDeleteRow: (index: number) => void;
}

const TableRow: React.FC<TableRowProps> = ({ item, index, onCellEdit, onDeleteRow }) => (
  <tr key={index}>
    <td className="index-cell">{index + 1}</td>
    <td className="word-cell">
      <div>{item.selection}</div>
    </td>
    <td className="word-cell">
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onCellEdit(index, 'lemma', e.target.textContent || '')}
      >
        {item.baseForm}
      </div>
    </td>
    <td className="definition-cell">
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onCellEdit(index, 'definition', e.target.textContent || '')}
      >
        {item.def}
      </div>
    </td>
    <td className="context-cell">
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onCellEdit(index, 'context', e.target.textContent || '')}
      >
        {item.context}
      </div>
    </td>
    <td className="delete-cell">
      <button
        className="delete-button"
        onClick={() => onDeleteRow(index)}
        aria-label="Delete row"
      >
        ×
      </button>
    </td>
  </tr>
);

export default TableRow;