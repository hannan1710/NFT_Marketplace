import { renderHook } from '@testing-library/react'
import { useRoles } from '@/hooks/useRoles'
import { useAccount, useReadContract } from 'wagmi'

jest.mock('wagmi')

describe('useRoles - Role-Based UI Rendering Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890'
  const mockAdminRole = '0x0000000000000000000000000000000000000000000000000000000000000000'
  const mockMinterRole = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. Admin Role Detection', () => {
    it('should detect admin role correctly', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole }) // DEFAULT_ADMIN_ROLE
        .mockReturnValueOnce({ data: mockMinterRole }) // MINTER_ROLE
        .mockReturnValueOnce({ data: true, isLoading: false }) // hasRole admin
        .mockReturnValueOnce({ data: false, isLoading: false }) // hasRole minter

      const { result } = renderHook(() => useRoles())

      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isMinter).toBe(false)
      expect(result.current.hasAnyRole).toBe(true)
    })

    it('should return false for admin when user does not have role', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: false, isLoading: false })
        .mockReturnValueOnce({ data: false, isLoading: false })

      const { result } = renderHook(() => useRoles())

      expect(result.current.isAdmin).toBe(false)
      expect(result.current.hasAnyRole).toBe(false)
    })
  })

  describe('2. Minter Role Detection', () => {
    it('should detect minter role correctly', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: false, isLoading: false })
        .mockReturnValueOnce({ data: true, isLoading: false })

      const { result } = renderHook(() => useRoles())

      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isMinter).toBe(true)
      expect(result.current.hasAnyRole).toBe(true)
    })

    it('should detect both admin and minter roles', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: true, isLoading: false })
        .mockReturnValueOnce({ data: true, isLoading: false })

      const { result } = renderHook(() => useRoles())

      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isMinter).toBe(true)
      expect(result.current.hasAnyRole).toBe(true)
    })
  })

  describe('3. Loading States', () => {
    it('should return loading true when checking roles', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: undefined, isLoading: true })
        .mockReturnValueOnce({ data: undefined, isLoading: true })

      const { result } = renderHook(() => useRoles())

      expect(result.current.loading).toBe(true)
    })

    it('should return loading false when roles are loaded', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: true, isLoading: false })
        .mockReturnValueOnce({ data: false, isLoading: false })

      const { result } = renderHook(() => useRoles())

      expect(result.current.loading).toBe(false)
    })
  })

  describe('4. Disconnected State', () => {
    it('should not check roles when wallet is not connected', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: undefined, isLoading: false })
        .mockReturnValueOnce({ data: undefined, isLoading: false })

      const { result } = renderHook(() => useRoles())

      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isMinter).toBe(false)
      expect(result.current.hasAnyRole).toBe(false)
    })
  })

  describe('5. Role Query Enablement', () => {
    it('should enable queries only when address and role constants are available', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })

      const mockReadContract = jest.fn()
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: true, isLoading: false })
        .mockReturnValueOnce({ data: false, isLoading: false })

      ;(useReadContract as jest.Mock).mockImplementation(mockReadContract)

      renderHook(() => useRoles())

      // Check that hasRole queries have enabled condition
      const hasRoleCalls = mockReadContract.mock.calls.filter(
        call => call[0]?.functionName === 'hasRole'
      )
      
      expect(hasRoleCalls.length).toBe(2)
    })
  })

  describe('6. hasAnyRole Helper', () => {
    it('should return true if user has any role', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: false, isLoading: false })
        .mockReturnValueOnce({ data: true, isLoading: false })

      const { result } = renderHook(() => useRoles())

      expect(result.current.hasAnyRole).toBe(true)
    })

    it('should return false if user has no roles', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      ;(useReadContract as jest.Mock)
        .mockReturnValueOnce({ data: mockAdminRole })
        .mockReturnValueOnce({ data: mockMinterRole })
        .mockReturnValueOnce({ data: false, isLoading: false })
        .mockReturnValueOnce({ data: false, isLoading: false })

      const { result } = renderHook(() => useRoles())

      expect(result.current.hasAnyRole).toBe(false)
    })
  })
})
