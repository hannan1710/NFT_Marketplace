import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '@/config/contracts';

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenId = BigInt(params.id);

    // Get token owner
    const owner = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_CONTRACT_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    });

    // Get token URI
    const tokenURI = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_CONTRACT_ABI,
      functionName: 'tokenURI',
      args: [tokenId],
    }) as string;

    // Parse metadata from token URI
    let metadata = null;
    
    // First try to fetch from our metadata storage
    try {
      const metadataResponse = await fetch(`http://localhost:3000/api/metadata/${params.id}`);
      if (metadataResponse.ok) {
        metadata = await metadataResponse.json();
      }
    } catch (err) {
      console.log('No metadata in storage, trying tokenURI');
    }
    
    // If not in storage, try tokenURI
    if (!metadata && tokenURI) {
      try {
        // Handle data URI
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.replace('data:application/json;base64,', '');
          const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
          metadata = JSON.parse(jsonString);
        } else if (tokenURI.startsWith('data:application/json,')) {
          const jsonString = tokenURI.replace('data:application/json,', '');
          metadata = JSON.parse(decodeURIComponent(jsonString));
        } else if (tokenURI.startsWith('http')) {
          // Fetch from HTTP URL
          const response = await fetch(tokenURI);
          metadata = await response.json();
        }
      } catch (error) {
        console.error('Error parsing metadata:', error);
      }
    }

    return NextResponse.json({
      tokenId: tokenId.toString(),
      owner,
      tokenURI,
      metadata,
    });
  } catch (error: any) {
    console.error('Error fetching NFT:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch NFT' },
      { status: 500 }
    );
  }
}
