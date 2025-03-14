const TitleBar = () => {
  const handleMinimize = () => {
    if (window.api) {
      window.api.window_minimize();
    }
  };

  const handleClose = () => {
    if (window.api) {
      window.api.window_close();
    }
  };

  return (
    <div className="fixed w-screen draggable flex items-center justify-end text-white h-10 z-10 pointer-events-none">
      <button
        onClick={handleMinimize}
        className="hover:bg-gray-600 w-8 h-8 flex items-center justify-center rounded pointer-events-auto"
      >
        <span className="text-sm">_</span>
      </button>
      <button
        onClick={handleClose}
        className="hover:bg-red-600 w-8 h-8 flex items-center justify-center rounded pointer-events-auto"
      >
        <span className="text-sm">X</span>
      </button>
    </div>
  );
};

export default TitleBar;