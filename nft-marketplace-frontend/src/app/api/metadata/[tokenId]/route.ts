import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (in production, use IPFS or database)
const metadataStore = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = params.tokenId;
  const metadata = metadataStore.get(tokenId);

  if (!metadata) {
    return NextResponse.json(
      { error: 'Metadata not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(metadata);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId;
    const body = await request.json();

    // Store metadata
    metadataStore.set(tokenId, {
      name: body.name,
      description: body.description,
      image: body.image,
      attributes: body.attributes || [],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to store metadata' },
      { status: 500 }
    );
  }
}
