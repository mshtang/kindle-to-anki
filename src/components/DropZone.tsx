import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DropZone.css";

const DropZone = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name === "vocab.db") {
      setFile(droppedFile);
      navigate('/decks', { state: { vocabFile: file } });
    } else {
      alert("Please drop a valid vocab.db file");
    }
  };

  return (
    <div
      className={`drop-zone ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2>Drag'n'drop from Kindle</h2>

      <ol className="instructions">
        <li>Connect your Kindle to the computer via a USB cable.</li>
        <li>
          Locate the <strong>vocab.db</strong> file on the Kindle disk (use
          Search).
        </li>
        <li>Drag and drop the file on this page.</li>
      </ol>

      <div className="privacy-note">
        <p>
          Note: the file is processed and stored entirely locally in your
          browser.
        </p>
        <p>We don't upload your Kindle data to any server.</p>
      </div>
    </div>
  );
};

export default DropZone;
