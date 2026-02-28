# NFT Marketplace Frontend

Production-ready Next.js frontend for the NFT marketplace ecosystem with AI-powered features.

## Features

### Core Functionality
- **Wagmi + Viem Integration** - Modern Web3 library stack
- **Multi-Wallet Support** - MetaMask, WalletConnect, Coinbase Wallet
- **Server-Side Rendering** - SSR for marketplace listings and SEO
- **Role-Based Access** - Admin and minter role detection and UI rendering

### Dashboard Features
- **NFT Price Prediction Display** - ML-powered price forecasts with confidence scores
- **Fraud Risk Badges** - Real-time fraud detection indicators
- **Trust Score Visualization** - Dynamic wallet reputation display
- **Gas Optimization Charts** - Compare standard vs optimized gas costs
- **Event Analytics** - Transaction history and statistics

### Admin Panel
- **Security Report Panel** - Smart contract vulnerability analysis
- **Contract Validation** - Real-time security scanning
- **Role Management** - Grant/revoke admin and minter roles
- **Contract Controls** - Pause, update settings, manage royalties

### UI/UX
- **TailwindCSS** - Modern, responsive design
- **Dark Mode Ready** - Theme support built-in
- **Animations** - Smooth transitions and loading states
- **Toast Notifications** - User-friendly feedback
- **Responsive Design** - Mobile-first approach

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Web3**: Wagmi v2 + Viem v2
- **Wallet**: WalletConnect, MetaMask, Coinbase Wallet
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **State**: Zustand + TanStack Query
- **HTTP**: Axios + SWR
- **TypeScript**: Full type safety

## Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet

## Installation

```bash
cd nft-marketplace-frontend
npm install
```

## Configuration

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Configure environment variables:

```env
# Blockchain
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...

# RPC URLs
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Microservices
NEXT_PUBLIC_VALIDATOR_API_URL=http://localhost:3000
NEXT_PUBLIC_PRICE_PREDICTOR_API_URL=http://localhost:8001
NEXT_PUBLIC_FRAUD_DETECTOR_API_URL=http://localhost:8000
NEXT_PUBLIC_TRUST_SCORE_API_URL=http://localhost:4000
NEXT_PUBLIC_EVENT_ORCHESTRATOR_API_URL=http://localhost:5000
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
npm start
```

## Project Structure

```
nft-marketplace-frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Home page
│   │   ├── marketplace/       # Marketplace listings
│   │   ├── dashboard/         # User dashboard
│   │   ├── admin/             # Admin panel
│   │   ├── nft/[id]/         # NFT detail page
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Web3 providers
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Navbar.tsx
│   │   ├── NFTCard.tsx
│   │   ├── TrustScoreDisplay.tsx
│   │   └── PricePredictionChart.tsx
│   ├── hooks/                 # Custom hooks
│   │   ├── useRoles.ts
│   │   └── useNFTMetadata.ts
│   ├── lib/                   # Utilities
│   │   └── api.ts            # API client
│   └── config/               # Configuration
│       ├── wagmi.ts          # Wagmi config
│       └── contracts.ts      # Contract ABIs
├── public/                   # Static assets
├── tailwind.config.ts       # Tailwind config
├── next.config.js           # Next.js config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

## Pages

### Home (`/`)
- Hero section with features
- Statistics overview
- Call-to-action sections

### Marketplace (`/marketplace`)
- NFT listings grid/list view
- Search and filters
- Price, fraud risk, and trust score badges
- SSR for SEO optimization

### Dashboard (`/dashboard`)
- Personal NFT portfolio
- Trust score visualization
- Price prediction charts
- Gas optimization comparison
- Event distribution analytics
- Recent activity feed
- Fraud risk summary

### NFT Detail (`/nft/[id]`)
- Full NFT information
- Purchase functionality
- Price prediction
- Fraud risk analysis
- Trust score of owner
- Attributes display

### Admin Panel (`/admin`)
- Smart contract security analyzer
- Vulnerability detection
- Severity classification
- Role-based access control
- Contract management tools

## Components

### Navbar
- Wallet connection
- Multi-wallet support
- Role-based menu items
- Responsive design

### NFTCard
- NFT preview
- Price display
- Analytics badges (price, fraud, trust)
- Hover effects

### TrustScoreDisplay
- Score visualization
- Progress bar
- Factor breakdown
- Trust level badge

### PricePredictionChart
- Line chart with historical data
- Current vs predicted price
- Confidence indicator
- Responsive design

## API Integration

All microservices are integrated via the API client (`src/lib/api.ts`):

```typescript
import { api } from '@/lib/api';

// Price Prediction
const price = await api.predictPrice({
  rarity_score: 75,
  creator_volume: 50000,
  demand_index: 80,
  price_trend: 1500,
});

// Fraud Detection
const fraud = await api.analyzeFraud({
  transaction_id: '0x...',
  nft_id: '123',
  seller: '0x...',
  buyer: '0x...',
  price: 1.5,
  timestamp: Date.now(),
});

// Trust Score
const trust = await api.getTrustScore('0x...');

// Contract Validation
const report = await api.validateContract(contractCode);
```

## Role-Based Access

The app detects user roles from smart contracts:

```typescript
import { useRoles } from '@/hooks/useRoles';

function Component() {
  const { isAdmin, isMinter } = useRoles();
  
  return (
    <>
      {isAdmin && <AdminPanel />}
      {isMinter && <MintButton />}
    </>
  );
}
```

## Styling

TailwindCSS with custom utilities:

```tsx
// Buttons
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-outline">Outline</button>

// Cards
<div className="card">Content</div>

// Badges
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-danger">Danger</span>

// Inputs
<input className="input" />
```

## Performance Optimizations

- **SSR** - Server-side rendering for marketplace
- **Image Optimization** - Next.js Image component
- **Code Splitting** - Automatic route-based splitting
- **Lazy Loading** - Components loaded on demand
- **Caching** - TanStack Query for data caching
- **Debouncing** - Search input optimization

## Security

- **Environment Variables** - Sensitive data in env vars
- **Input Validation** - All user inputs validated
- **XSS Protection** - React's built-in protection
- **CORS** - Proper CORS configuration
- **Rate Limiting** - Recommended for production

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

```bash
docker build -t nft-marketplace-frontend .
docker run -p 3000:3000 nft-marketplace-frontend
```

### Manual

```bash
npm run build
npm start
```

## Environment Variables

Required for production:

- `NEXT_PUBLIC_CHAIN_ID` - Blockchain network ID
- `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` - NFT contract address
- `NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS` - Marketplace address
- `NEXT_PUBLIC_ETHEREUM_RPC_URL` - RPC endpoint
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect ID
- All microservice URLs

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Troubleshooting

### Wallet Connection Issues
- Ensure MetaMask is installed
- Check network configuration
- Verify RPC URLs

### API Errors
- Confirm all microservices are running
- Check API URLs in `.env.local`
- Verify CORS settings

### Build Errors
- Clear `.next` folder
- Delete `node_modules` and reinstall
- Check Node.js version (18+)

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## License

MIT

## Support

For issues and questions:
- Check documentation
- Review example code
- Open GitHub issue

---

**Built with Next.js, Wagmi, and TailwindCSS**

Production-ready NFT marketplace frontend with AI-powered features.
