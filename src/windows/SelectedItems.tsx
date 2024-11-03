import React, { useContext } from "react";
import { SelectedContext } from "../context/SelectedContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SelectedItems({selectedImages}: {selectedImages: any[]}) {
    
  return (selectedImages.length > 0  &&  <div className="w-full">{JSON.stringify(selectedImages)}</div>);
}

export default SelectedItems;
