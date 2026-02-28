import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';
import { NFT_CONTRACT_ABI } from '@/config/contracts';

const client = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
});

const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const tokenId = params.id;

    // @ts-ignore - viem type issue with authorizationList
    const owner = await client.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_CONTRACT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    });

    // @ts-ignore - viem type issue with authorizationList
    const tokenURI = await client.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_CONTRACT_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    }) as string;

    // Parse metadata if it's a data URI
    let metadata = null;
    if (tokenURI.startsWith('data:application/json')) {
      const base64Data = tokenURI.split(',')[1];
      const jsonString = Buffer.from(base64Data, 'base64').toString();
      metadata = JSON.parse(jsonString);
    }

    return NextResponse.json({
      tokenId,
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
