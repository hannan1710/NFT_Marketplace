import { useState, useEffect } from 'react';
import axios from 'axios';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export function useNFTMetadata(tokenURI: string | undefined) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenURI) return;

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        // Handle IPFS URIs
        let url = tokenURI;
        if (tokenURI.startsWith('ipfs://')) {
          url = tokenURI.replace('ipfs://', process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/');
        }

        const response = await axios.get(url);
        setMetadata(response.data);
      } catch (err) {
        setError('Failed to fetch metadata');
        console.error('Metadata fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenURI]);

  return { metadata, loading, error };
}
