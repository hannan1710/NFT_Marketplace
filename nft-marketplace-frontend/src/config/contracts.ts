export const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`;
export const MARKETPLACE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`;

export const NFT_CONTRACT_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MINTER_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
] as const;

export const MARKETPLACE_CONTRACT_ABI = [
  // Read functions
  'function getListing(uint256 listingId) view returns (tuple(uint256 listingId, address nftContract, uint256 tokenId, address seller, uint256 price, bool active))',
  'function getAuction(uint256 auctionId) view returns (tuple(uint256 auctionId, address nftContract, uint256 tokenId, address seller, uint256 startPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool active, bool finalized))',
  'function getTotalListings() view returns (uint256)',
  'function getTotalAuctions() view returns (uint256)',
  'function marketplaceFee() view returns (uint256)',
  'function feeRecipient() view returns (address)',
  
  // Write functions
  'function createListing(address nftContract, uint256 tokenId, uint256 price)',
  'function purchaseListing(uint256 listingId) payable',
  'function cancelListing(uint256 listingId)',
  'function updateListingPrice(uint256 listingId, uint256 newPrice)',
  'function createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 duration)',
  'function placeBid(uint256 auctionId) payable',
  'function finalizeAuction(uint256 auctionId)',
  'function cancelAuction(uint256 auctionId)',
  
  // Events
  'event ListingCreated(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price)',
  'event ListingPurchased(uint256 indexed listingId, address indexed buyer, uint256 price)',
  'event ListingCancelled(uint256 indexed listingId)',
  'event AuctionCreated(uint256 indexed auctionId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 startPrice, uint256 endTime)',
  'event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)',
  'event AuctionFinalized(uint256 indexed auctionId, address indexed winner, uint256 amount)',
] as const;
