import { useEffect, useState } from "react";

function Search() {
  interface SearchResult {
    path: string;
    name: string;
    ext: string;
  }
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery) {
      window.api
        .simple_search(debouncedQuery)
        .then((response: SearchResult[]) => {
          setResults(response);
        })
        .catch((error: unknown) => {
          console.error("Search failed:", error);
        });
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="relative w-full overflow-x-hidden text-black">
      <input
        value={query}
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-transparent p-2 placeholder-black focus:outline-none"
        type="text"
        placeholder="Start Typing..."
        autoFocus
      />
      {results.length > 0 && (
        <div className="mt-2 max-h-[200px] min-w-[600px] overflow-y-auto border-t border-gray-300 overflow-x-hidden">
          <ul>
            {results.map((result, index) => (
              <li
                key={index}
                className={`flex items-center ${index != results.length - 1 && "border-b border-gray-300"} p-2`}
              >
                <div className="flex items-center gap-2 w-full">
                  <img
                    className="h-10 w-10"
                    src={`clipse://${result.path}`}
                  />
                  <div className="flex w-[80%] flex-col justify-center text-ellipsis">
                    <b className="overflow-hidden whitespace-nowrap overflow-ellipsis">{result.name}</b>
                    <p className="mb-1 text-sm overflow-hidden whitespace-nowrap overflow-ellipsis">{result.path}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Search;
