import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NFTCard } from '@/components/NFTCard'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { api } from '@/lib/api'

// Mock dependencies
jest.mock('wagmi')
jest.mock('@/lib/api')
jest.mock('@/hooks/useNFTMetadata')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}))
jest.mock('@/config/contracts', () => ({
  NFT_CONTRACT_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  MARKETPLACE_CONTRACT_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  NFT_CONTRACT_ABI: [],
  MARKETPLACE_CONTRACT_ABI: [],
}))

describe('NFTCard - API Integration & Display Tests', () => {
  const mockWriteContract = jest.fn()
  const mockUseNFTMetadata = jest.fn()
  
  const defaultProps = {
    tokenId: '1',
    tokenURI: 'ipfs://test',
    price: BigInt('1000000000000000000'), // 1 ETH
    seller: '0x1234567890123456789012345678901234567890',
    listingId: '1',
    showAnalytics: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock for useNFTMetadata
    mockUseNFTMetadata.mockReturnValue({
      metadata: {
        name: 'Test NFT',
        description: 'Test Description',
        image: 'https://example.com/image.png',
      },
      loading: false,
    })
    
    const { useNFTMetadata } = require('@/hooks/useNFTMetadata')
    useNFTMetadata.mockImplementation(mockUseNFTMetadata)
    
    ;(useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
    ;(api.predictPrice as jest.Mock).mockResolvedValue({
      predicted_price: 1.2,
      confidence: 0.85,
    })
    ;(api.analyzeFraud as jest.Mock).mockResolvedValue({
      risk_score: 25,
      risk_category: 'Low',
      flags: [],
      fraud_detected: false,
    })
    ;(api.getTrustScore as jest.Mock).mockResolvedValue({
      trustScore: 85,
      trustLevel: 'High',
    })
  })

  describe('1. NFT Display', () => {
    it('should render NFT card with metadata', () => {
      render(<NFTCard {...defaultProps} />)
      
      expect(screen.getByText('Test NFT')).toBeInTheDocument()
      expect(screen.getByAltText('Test NFT')).toBeInTheDocument()
    })

    it('should display price in ETH', () => {
      render(<NFTCard {...defaultProps} />)
      
      expect(screen.getByText('1.000 ETH')).toBeInTheDocument()
    })

    it('should render without price when not provided', () => {
      render(<NFTCard {...defaultProps} price={undefined} />)
      
      expect(screen.queryByText(/ETH/)).not.toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseNFTMetadata.mockReturnValueOnce({
        metadata: null,
        loading: true,
      })

      render(<NFTCard {...defaultProps} />)
      
      const loadingElement = document.querySelector('.animate-pulse')
      expect(loadingElement).toBeInTheDocument()
    })
  })

  describe('2. API Integration Mock', () => {
    it('should fetch and display price prediction', async () => {
      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        expect(api.predictPrice).toHaveBeenCalled()
        expect(screen.getByText('1.20 ETH')).toBeInTheDocument()
      })
    })

    it('should fetch and display fraud risk', async () => {
      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        expect(api.analyzeFraud).toHaveBeenCalled()
        expect(screen.getByText('Low')).toBeInTheDocument()
      })
    })

    it('should fetch and display trust score', async () => {
      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        expect(api.getTrustScore).toHaveBeenCalledWith(defaultProps.seller)
        expect(screen.getByText('85/100')).toBeInTheDocument()
      })
    })

    it('should not fetch analytics when showAnalytics is false', async () => {
      render(<NFTCard {...defaultProps} showAnalytics={false} />)
      
      await waitFor(() => {
        expect(api.predictPrice).not.toHaveBeenCalled()
        expect(api.analyzeFraud).not.toHaveBeenCalled()
        expect(api.getTrustScore).not.toHaveBeenCalled()
      })
    })

    it('should handle API errors gracefully', async () => {
      ;(api.predictPrice as jest.Mock).mockRejectedValue(new Error('API Error'))
      
      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        expect(api.predictPrice).toHaveBeenCalled()
      })
      
      // Should not crash, just not display prediction
      expect(screen.queryByText(/Predicted/)).not.toBeInTheDocument()
    })
  })

  describe('3. Fraud Risk Badge Display', () => {
    it('should display Low risk with green badge', async () => {
      ;(api.analyzeFraud as jest.Mock).mockResolvedValue({
        risk_score: 15,
        risk_category: 'Low',
      })

      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        const badge = screen.getByText('Low')
        expect(badge).toHaveClass('text-success-600')
      })
    })

    it('should display Medium risk with yellow badge', async () => {
      ;(api.analyzeFraud as jest.Mock).mockResolvedValue({
        risk_score: 50,
        risk_category: 'Medium',
      })

      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        const badge = screen.getByText('Medium')
        expect(badge).toHaveClass('text-warning-600')
      })
    })

    it('should display High risk with red badge', async () => {
      ;(api.analyzeFraud as jest.Mock).mockResolvedValue({
        risk_score: 85,
        risk_category: 'High',
      })

      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        const badge = screen.getByText('High')
        expect(badge).toHaveClass('text-danger-600')
      })
    })
  })

  describe('4. Trust Score Visualization', () => {
    it('should display high trust score with green badge', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 90,
      })

      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        const badge = screen.getByText('90/100')
        expect(badge).toHaveClass('text-success-600')
      })
    })

    it('should display medium trust score with blue badge', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 65,
      })

      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        const badge = screen.getByText('65/100')
        expect(badge).toHaveClass('text-primary-600')
      })
    })

    it('should display low trust score with red badge', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 30,
      })

      render(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        const badge = screen.getByText('30/100')
        expect(badge).toHaveClass('text-danger-600')
      })
    })
  })

  describe('5. Buy Functionality', () => {
    it('should render Buy Now button when price and listingId exist', () => {
      render(<NFTCard {...defaultProps} />)
      
      expect(screen.getByText('Buy Now')).toBeInTheDocument()
    })

    it('should not render Buy Now button without price', () => {
      render(<NFTCard {...defaultProps} price={undefined} />)
      
      expect(screen.queryByText('Buy Now')).not.toBeInTheDocument()
    })

    it('should call writeContract when Buy Now is clicked', async () => {
      render(<NFTCard {...defaultProps} />)
      
      const buyButton = screen.getByText('Buy Now')
      fireEvent.click(buyButton)
      
      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalledWith({
          address: expect.any(String),
          abi: expect.any(Array),
          functionName: 'purchaseListing',
          args: [BigInt('1')],
          value: defaultProps.price,
        })
      })
    })

    it('should disable button when transaction is pending', () => {
      ;(useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: true,
      })

      render(<NFTCard {...defaultProps} />)
      
      const buyButton = screen.getByRole('button', { name: /buying/i })
      expect(buyButton).toBeDisabled()
    })

    it('should show success message after successful purchase', async () => {
      const toast = require('react-hot-toast').default
      
      const { rerender } = render(<NFTCard {...defaultProps} />)
      
      ;(useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })
      
      rerender(<NFTCard {...defaultProps} />)
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('NFT purchased successfully!')
      })
    })
  })

  describe('6. Image Handling', () => {
    it('should convert IPFS URLs to gateway URLs', () => {
      const useNFTMetadata = require('@/hooks/useNFTMetadata').useNFTMetadata
      useNFTMetadata.mockReturnValue({
        metadata: {
          name: 'Test NFT',
          image: 'ipfs://QmTest123',
        },
        loading: false,
      })

      render(<NFTCard {...defaultProps} />)
      
      const image = screen.getByAltText('Test NFT')
      expect(image).toHaveAttribute('src', expect.stringContaining('ipfs'))
    })

    it('should use placeholder for missing images', () => {
      const useNFTMetadata = require('@/hooks/useNFTMetadata').useNFTMetadata
      useNFTMetadata.mockReturnValue({
        metadata: {
          name: 'Test NFT',
          image: undefined,
        },
        loading: false,
      })

      render(<NFTCard {...defaultProps} />)
      
      const image = screen.getByAltText('Test NFT')
      expect(image).toHaveAttribute('src', expect.stringContaining('placeholder'))
    })
  })

  describe('7. Link Navigation', () => {
    it('should link to NFT detail page', () => {
      render(<NFTCard {...defaultProps} />)
      
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/nft/1')
    })

    it('should prevent navigation when Buy button is clicked', () => {
      render(<NFTCard {...defaultProps} />)
      
      const buyButton = screen.getByText('Buy Now')
      const clickEvent = new MouseEvent('click', { bubbles: true })
      const stopPropagation = jest.spyOn(clickEvent, 'stopPropagation')
      const preventDefault = jest.spyOn(clickEvent, 'preventDefault')
      
      fireEvent(buyButton, clickEvent)
      
      expect(stopPropagation).toHaveBeenCalled()
      expect(preventDefault).toHaveBeenCalled()
    })
  })
})
