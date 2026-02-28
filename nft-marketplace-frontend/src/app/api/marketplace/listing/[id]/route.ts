import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';
import { MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';

const client = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = params.id;
    
    const listing = await client.readContract({
      address: MARKETPLACE_CONTRACT_ADDRESS,
      abi: MARKETPLACE_CONTRACT_ABI,
      functionName: 'getListing',
      args: [BigInt(listingId)],
    }) as any;

    return NextResponse.json({
      nftContract: listing.nftContract,
      tokenId: listing.tokenId.toString(),
      seller: listing.seller,
      price: listing.price.toString(),
      active: listing.active,
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}
