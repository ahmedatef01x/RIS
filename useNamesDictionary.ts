import { useState, useCallback } from 'react';

interface DictionaryName {
  id: number;
  arabicName: string;
  englishName: string;
}

export function useNamesDictionary() {
  const [searchResults, setSearchResults] = useState<DictionaryName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search names with fuzzy matching
  const searchNames = useCallback(async (query: string): Promise<DictionaryName[]> => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? `http://localhost:3001/api/names/search?q=${encodeURIComponent(query.trim())}`
        : `/api/names/search?q=${encodeURIComponent(query.trim())}`;
      
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Failed to search names');
      }

      const results = await response.json();
      setSearchResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setSearchResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Lookup exact match for Arabic name
  const lookupName = useCallback(async (arabicName: string): Promise<DictionaryName | null> => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = window.location.hostname === 'localhost'
        ? `http://localhost:3001/api/names/lookup/${encodeURIComponent(arabicName.trim())}`
        : `/api/names/lookup/${encodeURIComponent(arabicName.trim())}`;
      
      const response = await fetch(apiUrl);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to lookup name');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new name pair to dictionary
  const addName = useCallback(
    async (arabicName: string, englishName: string): Promise<DictionaryName | null> => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:3001/api/names'
          : '/api/names';
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            arabicName: arabicName.trim(),
            englishName: englishName.trim(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add name');
        }

        const result = await response.json();
        
        // Update search results to include the newly added name
        setSearchResults((prev) => [
          { id: result.id, arabicName: result.arabicName, englishName: result.englishName },
          ...prev,
        ]);

        return { id: result.id, arabicName: result.arabicName, englishName: result.englishName };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    searchResults,
    loading,
    error,
    searchNames,
    lookupName,
    addName,
    setSearchResults,
    setError,
  };
}
