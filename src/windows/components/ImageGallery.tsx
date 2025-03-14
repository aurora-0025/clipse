import React, { useContext, useEffect, useRef, useState } from "react";
import { SelectedContext } from "../../context/SelectedContext";
import { ImageSearchResult } from "../Search";

interface Image {
  path: string;
  filename: string;
}

interface ImageResultProps {
  results: ImageSearchResult[];
}

const ImageGallery: React.FC<ImageResultProps> = ({ results }) => {
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

  useEffect(() => {
    if (selectedIndexes.length > 0) setSelectedImages(selectedIndexes.map((i) => results.at(i)!));
    else setSelectedImages([]);
  }, [results, selectedIndexes, setSelectedImages])

  // Handle click when selection mode is active
  const handleClick = (e: React.MouseEvent<HTMLElement>, index: number, path: string) => {
    console.log("asdas");
    e.stopPropagation();
    // Ignore the click if the selection was already made by long press
    
    if (preventClickRef.current) {
      preventClickRef.current = false; // Reset the flag for future clicks
      return;
    }

    const imagePath = path.replace("clipse://", ""); // Convert to a file path
    console.log(imagePath);
    
    window.api.open_file(imagePath);

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
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    window.api.get_all_images().then((data: Image[]) => {
      console.log(data);

      setImages(data);
    });
  }, []);

  return (
    <div className="mt-2 grid grid-cols-3 gap-2 overflow-y-scroll px-5 pt-2 bg-zinc-800 ml-5 rounded-md h-full">
      {results.length == 0 && (
        <>
          {images.map((image, i) => (
            <button
              onClick={(e) => handleClick(e, i, image.path)} 
              key={image.path}
              className={`relative flex items-center justify-center rounded-lg bg-zinc-400/30 p-5`}
              draggable={false}
            >
              <img
                className="h-auto max-h-[40vh] max-w-full rounded-lg object-cover object-center"
                src={`clipse://${image.path}`}
                alt={image.filename}
                draggable
              />
            </button>
          ))}

        </>)}
      {results.map((result, j) => (
        <button
          key={j}
          className={`relative flex items-center justify-center rounded-lg bg-zinc-400/30 p-5 ${selectedIndexes.includes(j) ? "selected" : ""}`}
          data-index={j}
          onMouseDown={() => handleMouseDown(j)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => handleClick(e, j, result.path)} // Handle simple clicks for selection
          draggable={false}
        >
          <img
            className="h-auto max-h-[40vh] max-w-full rounded-lg object-cover object-center"
            src={`clipse://${result.path}`}
            onDragStart={(event) => handleDragStart(event, j)}
            alt={result.name}
            draggable
          />
          <div className="absolute bottom-1 right-1 px-2 bg-zinc-400/30 rounded-md ">{result.mode}</div>
        </button>
      ))}
    </div>
  );
};

export default ImageGallery;