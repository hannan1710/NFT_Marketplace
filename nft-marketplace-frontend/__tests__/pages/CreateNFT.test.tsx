import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateNFTPage from '@/app/create/page'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

jest.mock('wagmi')
jest.mock('@/components/Navbar', () => ({
  Navbar: () => <div>Navbar</div>,
}))

// Mock contract config
jest.mock('@/config/contracts', () => ({
  NFT_CONTRACT_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  MARKETPLACE_CONTRACT_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  NFT_CONTRACT_ABI: [],
  MARKETPLACE_CONTRACT_ABI: [],
}))

describe('CreateNFTPage - NFT Mint Form Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890'
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    ;(useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      error: null,
    })
    ;(useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  describe('1. Form Rendering', () => {
    it('should render create NFT form when connected', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      expect(screen.getByText('Create NFT')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('My Awesome NFT')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Describe your NFT...')).toBeInTheDocument()
    })

    it('should show connect wallet message when not connected', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })

      render(<CreateNFTPage />)

      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument()
      expect(screen.getByText('Please connect your wallet to create NFTs')).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Price \(ETH\)/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Royalty \(%\)/)).toBeInTheDocument()
    })
  })

  describe('2. Form Validation', () => {
    it('should disable submit button when required fields are empty', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const submitButton = screen.getByRole('button', { name: /Mint NFT/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when all required fields are filled', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const nameInput = screen.getByPlaceholderText('My Awesome NFT')
      const descriptionInput = screen.getByPlaceholderText('Describe your NFT...')

      await userEvent.type(nameInput, 'Test NFT')
      await userEvent.type(descriptionInput, 'Test Description')

      // Simulate image upload
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      
      fireEvent.change(fileInput!)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Mint NFT/i })
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('3. Image Upload', () => {
    it('should handle image upload', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput!)

      await waitFor(() => {
        expect(screen.queryByText(/Click to upload/)).not.toBeInTheDocument()
      })
    })

    it('should show image preview after upload', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null as any,
        result: 'data:image/png;base64,test',
      }
      
      global.FileReader = jest.fn(() => mockFileReader) as any

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput!)

      // Trigger onloadend
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend()
      }

      await waitFor(() => {
        const preview = screen.getByAltText('Preview')
        expect(preview).toBeInTheDocument()
      })
    })

    it('should allow removing uploaded image', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null as any,
        result: 'data:image/png;base64,test',
      }
      
      global.FileReader = jest.fn(() => mockFileReader) as any

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput!)

      if (mockFileReader.onloadend) {
        mockFileReader.onloadend()
      }

      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument()
      })

      const removeButton = screen.getByText('Remove')
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(screen.queryByAltText('Preview')).not.toBeInTheDocument()
        expect(screen.getByText(/Click to upload/)).toBeInTheDocument()
      })
    })
  })

  describe('4. Form Submission', () => {
    it('should call writeContract when form is submitted', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const nameInput = screen.getByPlaceholderText('My Awesome NFT')
      const descriptionInput = screen.getByPlaceholderText('Describe your NFT...')

      await userEvent.type(nameInput, 'Test NFT')
      await userEvent.type(descriptionInput, 'Test Description')

      // Simulate image upload
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null as any,
        result: 'data:image/png;base64,test',
      }
      
      global.FileReader = jest.fn(() => mockFileReader) as any

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput!)

      if (mockFileReader.onloadend) {
        mockFileReader.onloadend()
      }

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Mint NFT/i })
        expect(submitButton).not.toBeDisabled()
      })

      const submitButton = screen.getByRole('button', { name: /Mint NFT/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalledWith({
          address: expect.any(String),
          abi: expect.any(Array),
          functionName: 'mint',
          args: [mockAddress],
        })
      })
    })
  })

  describe('5. Loading States', () => {
    it('should show loading state during transaction', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: true,
        error: null,
      })

      render(<CreateNFTPage />)

      expect(screen.getByText('Confirm in Wallet...')).toBeInTheDocument()
    })

    it('should show confirming state', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: '0xhash',
        isPending: false,
        error: null,
      })
      ;(useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      })

      render(<CreateNFTPage />)

      expect(screen.getByText('Minting NFT...')).toBeInTheDocument()
    })

    it('should disable submit button during transaction', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: true,
        error: null,
      })

      render(<CreateNFTPage />)

      const submitButton = screen.getByRole('button', { name: /Confirm in Wallet/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('6. Error Handling Display', () => {
    it('should display error message when transaction fails', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        error: { message: 'User rejected transaction' },
      })

      render(<CreateNFTPage />)

      expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
      expect(screen.getByText(/User rejected transaction/)).toBeInTheDocument()
    })

    it('should display role error with helpful message', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        error: { message: 'AccessControl: account is missing role' },
      })

      render(<CreateNFTPage />)

      expect(screen.getByText(/You need MINTER_ROLE to mint NFTs/)).toBeInTheDocument()
      expect(screen.getByText(/npx hardhat run scripts\/grantAllRoles.js/)).toBeInTheDocument()
    })
  })

  describe('7. Success State', () => {
    it('should show success message after minting', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      render(<CreateNFTPage />)

      expect(screen.getByText('NFT Minted Successfully!')).toBeInTheDocument()
      expect(screen.getByText('Your NFT has been created and added to your collection')).toBeInTheDocument()
    })

    it('should show action buttons after success', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      render(<CreateNFTPage />)

      expect(screen.getByText('View in Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Create Another')).toBeInTheDocument()
    })
  })

  describe('8. Optional Fields', () => {
    it('should allow optional price field', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const priceInput = screen.getByPlaceholderText('0.1')
      await userEvent.type(priceInput, '1.5')

      expect(priceInput).toHaveValue(1.5)
    })

    it('should have default royalty value', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const royaltyInput = screen.getByDisplayValue('5')
      expect(royaltyInput).toBeInTheDocument()
    })

    it('should allow changing royalty percentage', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      render(<CreateNFTPage />)

      const royaltyInput = screen.getByDisplayValue('5')
      await userEvent.clear(royaltyInput)
      await userEvent.type(royaltyInput, '10')

      expect(royaltyInput).toHaveValue(10)
    })
  })
})
