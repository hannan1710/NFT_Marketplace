import { render, screen, waitFor } from '@testing-library/react'
import { TrustScoreDisplay } from '@/components/TrustScoreDisplay'
import { api } from '@/lib/api'

jest.mock('@/lib/api')

describe('TrustScoreDisplay - Trust Score Visualization Tests', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. Trust Score Display', () => {
    it('should display trust score correctly', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument()
        expect(screen.getByText('/100')).toBeInTheDocument()
      })
    })

    it('should display trust level badge', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        expect(screen.getByText('High')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      ;(api.getTrustScore as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      const loadingElement = document.querySelector('.animate-pulse')
      expect(loadingElement).toBeInTheDocument()
    })

    it('should show error state when API fails', async () => {
      ;(api.getTrustScore as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        expect(screen.getByText('Trust score unavailable')).toBeInTheDocument()
      })
    })
  })

  describe('2. Color Coding by Score', () => {
    it('should use green color for high trust score (80+)', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 90,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        const scoreElement = screen.getByText('90')
        expect(scoreElement).toHaveClass('text-success-600')
      })
    })

    it('should use blue color for medium-high trust score (60-79)', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 70,
        trustLevel: 'Medium',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        const scoreElement = screen.getByText('70')
        expect(scoreElement).toHaveClass('text-primary-600')
      })
    })

    it('should use yellow color for medium trust score (40-59)', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 50,
        trustLevel: 'Medium',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        const scoreElement = screen.getByText('50')
        expect(scoreElement).toHaveClass('text-warning-600')
      })
    })

    it('should use red color for low trust score (<40)', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 25,
        trustLevel: 'Low',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        const scoreElement = screen.getByText('25')
        expect(scoreElement).toHaveClass('text-danger-600')
      })
    })
  })

  describe('3. Progress Bar Visualization', () => {
    it('should render progress bar with correct width', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 75,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        const progressFill = document.querySelector('[style*="width: 75%"]')
        expect(progressFill).toBeInTheDocument()
      })
    })

    it('should use appropriate color for progress bar', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        const progressBar = document.querySelector('.bg-success-600')
        expect(progressBar).toBeInTheDocument()
      })
    })
  })

  describe('4. Detailed Factors Display', () => {
    it('should show detailed factors when showDetails is true', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        factors: {
          transactionHistory: 90,
          disputeHistory: 95,
          accountAge: 80,
          fraudRiskHistory: 85,
          behavioralConsistency: 75,
        },
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} showDetails={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Score Breakdown')).toBeInTheDocument()
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
        expect(screen.getByText('Dispute History')).toBeInTheDocument()
        expect(screen.getByText('Account Age')).toBeInTheDocument()
        expect(screen.getByText('Fraud Risk')).toBeInTheDocument()
        expect(screen.getByText('Behavioral Consistency')).toBeInTheDocument()
      })
    })

    it('should not show detailed factors when showDetails is false', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        factors: {
          transactionHistory: 90,
          disputeHistory: 95,
          accountAge: 80,
          fraudRiskHistory: 85,
          behavioralConsistency: 75,
        },
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} showDetails={false} />)
      
      await waitFor(() => {
        expect(screen.queryByText('Score Breakdown')).not.toBeInTheDocument()
      })
    })

    it('should display factor values with weights', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        factors: {
          transactionHistory: 90.5,
          disputeHistory: 95.2,
          accountAge: 80.0,
          fraudRiskHistory: 85.7,
          behavioralConsistency: 75.3,
        },
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} showDetails={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('90.5 (25%)')).toBeInTheDocument() // Transaction History
        expect(screen.getByText('95.2 (20%)')).toBeInTheDocument() // Dispute History
        expect(screen.getByText('80.0 (15%)')).toBeInTheDocument() // Account Age
        expect(screen.getByText('85.7 (25%)')).toBeInTheDocument() // Fraud Risk
        expect(screen.getByText('75.3 (15%)')).toBeInTheDocument() // Behavioral Consistency
      })
    })
  })

  describe('5. Last Updated Timestamp', () => {
    it('should display last updated date', async () => {
      const testDate = new Date('2024-01-15T10:30:00Z')
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        lastUpdated: testDate.toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
        expect(screen.getByText(new RegExp(testDate.toLocaleDateString()))).toBeInTheDocument()
      })
    })
  })

  describe('6. API Integration', () => {
    it('should call getTrustScore with correct wallet address', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        expect(api.getTrustScore).toHaveBeenCalledWith(mockWalletAddress)
      })
    })

    it('should refetch when wallet address changes', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      const { rerender } = render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        expect(api.getTrustScore).toHaveBeenCalledTimes(1)
      })

      const newAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      rerender(<TrustScoreDisplay walletAddress={newAddress} />)
      
      await waitFor(() => {
        expect(api.getTrustScore).toHaveBeenCalledWith(newAddress)
        expect(api.getTrustScore).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('7. Shield Icon Display', () => {
    it('should display shield icon with appropriate color', async () => {
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
        lastUpdated: new Date().toISOString(),
      })

      render(<TrustScoreDisplay walletAddress={mockWalletAddress} />)
      
      await waitFor(() => {
        const shieldIcon = document.querySelector('.text-success-600')
        expect(shieldIcon).toBeInTheDocument()
      })
    })
  })
})
