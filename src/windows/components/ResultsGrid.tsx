import React, { useContext, useEffect, useRef, useState } from "react";
import "./selected.css";
import { SelectedContext } from "../../context/SelectedContext";

interface ImageResult {
  name: string;
  path: string;
}

interface ImageResultProps {
  results: ImageResult[];
}

const ResultsGrid: React.FC<ImageResultProps> = ({ results }) => {
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const { selectedImages, setSelectedImages } = useContext(SelectedContext)!;

  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preventClickRef = useRef<boolean>(false);

  const handleMouseDown = (index: number) => {
    holdTimeoutRef.current = setTimeout(() => {
      setIsSelectionMode(true); // Activate selection mode
      toggleSelection(index); // Select the current item
      preventClickRef.current = true; // Set flag to prevent click
    }, 1000); // Trigger after 1 second (1000 ms)
  };

  const handleMouseUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  // Toggle selection for an item
  const toggleSelection = (index: number) => {
    setSelectedIndexes((prevSelected) => {
      const updatedSelected = prevSelected.includes(index)
        ? prevSelected.filter((i) => i !== index)
        : [...prevSelected, index];
      if (updatedSelected.length === 0) {
        setIsSelectionMode(false);
      }      
      return updatedSelected;
    });
  };

  useEffect(()=> {
    if (selectedIndexes.length > 0) setSelectedImages(selectedIndexes.map((i)=> results.at(i)!));
    else setSelectedImages([]);
  }, [results, selectedIndexes, setSelectedImages])

  // Handle click when selection mode is active
  const handleClick = (e: React.MouseEvent<HTMLElement>, index: number) => {
    e.stopPropagation();
    // Ignore the click if the selection was already made by long press
    if (preventClickRef.current) {
      preventClickRef.current = false; // Reset the flag for future clicks
      return;
    }

    if (isSelectionMode) {
      toggleSelection(index); // Allow clicking to select when in selection mode
    }
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLImageElement>,
    index: number,
  ) => {
    event.preventDefault();
    console.log("testing");

    let selectedPaths: string[];
    preventClickRef.current = true;

    if (!isSelectionMode) {
      selectedPaths = [results[index].path];
    } else {
      selectedPaths = selectedIndexes.map((i) => results[i].path);
    }

    // event.dataTransfer.setData('DownloadURL', selectedPaths.map(filePath => filePath.replace('clipse://', 'file://')).join('\n'));

    // const dragPreview = createDragPreview(selectedIndexes);
    // if (dragPreview) {
    //   document.body.appendChild(dragPreview);
    //   event.dataTransfer.setDragImage(dragPreview, 0, 0);
    // }

    // setTimeout(() => {
    //   if (dragPreview) {
    //     document.body.removeChild(dragPreview);
    //   }
    // }, 0);
  };

  const createDragPreview = (selectedIndexes: number[]) => {
    const preview = document.createElement("div");
    preview.style.display = "flex";
    preview.style.position = "absolute";
    preview.style.pointerEvents = "none";
    preview.style.top = "-9999px"; // Hide it offscreen initially

    selectedIndexes.slice(0, 5).forEach((i, idx) => {
      const img = document.createElement("img");
      img.src = `clipse://${results[i].path}`;
      img.style.width = "50px";
      img.style.height = "50px";
      img.style.border = "2px solid white";
      img.style.borderRadius = "5px";
      img.style.boxShadow = "0px 0px 5px rgba(0, 0, 0, 0.5)";
      img.style.position = "relative";
      img.style.left = `${idx * 15}px`; // Stagger images slightly
      img.style.top = `${idx * 15}px`; // Stagger images slightly
      preview.appendChild(img);
    });
    return preview;
  };

  const chunkArray = (array: ImageResult[], size: number) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };
  if (results.length > 0) {
    return (
      <div
        onClick={() => {
          setSelectedIndexes([]);
        }}
        className="mt-2 grid max-h-[200px] grid-cols-3 gap-2 overflow-y-scroll border-t border-zinc-100 px-5 pt-2"
      >
            {results.map((result, j) => (
              <button
                key={j}
                className={`relative flex items-center justify-center rounded-lg bg-zinc-400/30 p-5 ${selectedIndexes.includes(j) ? "selected" : ""}`}
                data-index={j}
                onMouseDown={() => handleMouseDown(j)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => handleClick(e, j)} // Handle simple clicks for selection
                draggable={false}
              >
                <img
                  className="h-auto max-h-[40vh] max-w-full rounded-lg object-cover object-center"
                  src={`clipse://${result.path}`}
                  onDragStart={(event) => handleDragStart(event, j)}
                  alt={result.name}
                  draggable
                />
              </button>
            ))}
      </div>
    );
  }
};

export default ResultsGrid;
