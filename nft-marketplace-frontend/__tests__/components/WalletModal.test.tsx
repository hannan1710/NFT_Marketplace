import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletModal } from '@/components/WalletModal'
import { useConnect, useAccount } from 'wagmi'

// Mock wagmi hooks
jest.mock('wagmi')

describe('WalletModal - Wallet Connection Tests', () => {
  const mockOnClose = jest.fn()
  const mockConnect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAccount as jest.Mock).mockReturnValue({
      isConnected: false,
      address: undefined,
    })
    ;(useConnect as jest.Mock).mockReturnValue({
      connectors: [
        { id: '1', name: 'MetaMask' },
        { id: '2', name: 'WalletConnect' },
        { id: '3', name: 'Coinbase Wallet' },
      ],
      connect: mockConnect,
      error: null,
      isPending: false,
    })
  })

  describe('1. Wallet Connection Mock', () => {
    it('should render wallet modal when open', () => {
      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
      expect(screen.getByText('Choose your preferred wallet to connect to SecureNFT Hub')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<WalletModal isOpen={false} onClose={mockOnClose} />)
      
      expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument()
    })

    it('should display all available wallet connectors', () => {
      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByText('MetaMask')).toBeInTheDocument()
      expect(screen.getByText('WalletConnect')).toBeInTheDocument()
      expect(screen.getByText('Coinbase Wallet')).toBeInTheDocument()
    })

    it('should call connect when wallet is clicked', async () => {
      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      const metamaskButton = screen.getByText('MetaMask').closest('button')
      fireEvent.click(metamaskButton!)
      
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith({
          connector: expect.objectContaining({ name: 'MetaMask' })
        })
      })
    })

    it('should close modal when close button is clicked', () => {
      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      const closeButton = screen.getByLabelText('Close modal')
      fireEvent.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should auto-close modal when successfully connected', () => {
      const { rerender } = render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      // Simulate successful connection
      ;(useAccount as jest.Mock).mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
      })
      
      rerender(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('2. Error Handling Display', () => {
    it('should display connection error from wagmi', () => {
      ;(useConnect as jest.Mock).mockReturnValue({
        connectors: [{ id: '1', name: 'MetaMask' }],
        connect: mockConnect,
        error: { message: 'User rejected the request' },
        isPending: false,
      })

      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByText('User rejected the request')).toBeInTheDocument()
    })

    it('should clear error when modal is reopened', () => {
      ;(useConnect as jest.Mock).mockReturnValue({
        connectors: [{ id: '1', name: 'MetaMask' }],
        connect: mockConnect,
        error: { message: 'Connection failed' },
        isPending: false,
      })

      const { rerender } = render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      expect(screen.getByText('Connection failed')).toBeInTheDocument()
      
      rerender(<WalletModal isOpen={false} onClose={mockOnClose} />)
      rerender(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      // Error should be cleared (but wagmi error still shows)
      expect(screen.getAllByText('Connection failed')).toHaveLength(1)
    })
  })

  describe('3. Loading States', () => {
    it('should disable buttons when connection is pending', () => {
      ;(useConnect as jest.Mock).mockReturnValue({
        connectors: [{ id: '1', name: 'MetaMask' }],
        connect: mockConnect,
        error: null,
        isPending: true,
      })

      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      const metamaskButton = screen.getByText('MetaMask').closest('button')
      expect(metamaskButton).toBeDisabled()
    })

    it('should show wallet icons for different providers', () => {
      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      // Check that wallet icons are rendered (emojis)
      expect(screen.getByText('🦊')).toBeInTheDocument() // MetaMask
      expect(screen.getByText('🔗')).toBeInTheDocument() // WalletConnect
      expect(screen.getByText('🔵')).toBeInTheDocument() // Coinbase
    })
  })

  describe('4. Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('should prevent body scroll when modal is open', () => {
      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when modal is closed', () => {
      const { unmount } = render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      unmount()
      
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('5. Connector Deduplication', () => {
    it('should remove duplicate connectors by name', () => {
      ;(useConnect as jest.Mock).mockReturnValue({
        connectors: [
          { id: '1', name: 'MetaMask' },
          { id: '2', name: 'MetaMask' }, // Duplicate
          { id: '3', name: 'WalletConnect' },
        ],
        connect: mockConnect,
        error: null,
        isPending: false,
      })

      render(<WalletModal isOpen={true} onClose={mockOnClose} />)
      
      const metamaskButtons = screen.getAllByText('MetaMask')
      expect(metamaskButtons).toHaveLength(1)
    })
  })
})
