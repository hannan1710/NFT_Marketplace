import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';
import { MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = BigInt(params.id);

    // Get listing data
    const listing = await publicClient.readContract({
      address: MARKETPLACE_CONTRACT_ADDRESS,
      abi: MARKETPLACE_CONTRACT_ABI,
      functionName: 'getListing',
      args: [listingId],
    }) as any;

    return NextResponse.json({
      listingId: listingId.toString(),
      nftContract: listing[0],
      tokenId: listing[1].toString(),
      seller: listing[2],
      price: listing[3].toString(),
      active: listing[4],
    });
  } catch (error: any) {
    console.error('Error fetching listing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch listing' },
      { status: 500 }
    );
  }
}
