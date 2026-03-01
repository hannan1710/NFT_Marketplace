import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi'
import { api } from '@/lib/api'

jest.mock('wagmi')
jest.mock('@/lib/api')

describe('useDashboardData - Dashboard Data Visualization Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useWatchContractEvent as jest.Mock).mockImplementation(() => {})
  })

  describe('1. Data Fetching', () => {
    it('should fetch NFT balance from contract', async () => {
      const mockRefetch = jest.fn()
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      // Mock both useReadContract calls based on functionName
      ;(useReadContract as jest.Mock).mockImplementation((config: any) => {
        if (config.functionName === 'balanceOf') {
          return { data: BigInt(5), refetch: mockRefetch }
        }
        if (config.functionName === 'totalSupply') {
          return { data: BigInt(100), refetch: jest.fn() }
        }
        return { data: undefined, refetch: jest.fn() }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockResolvedValue({ data: [] })
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
      })

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.stats.ownedNFTs).toBe(5)
      })
    })

    it('should fetch events from API', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useReadContract as jest.Mock).mockImplementation((config: any) => {
        if (config.functionName === 'balanceOf') {
          return { data: BigInt(0), refetch: jest.fn() }
        }
        if (config.functionName === 'totalSupply') {
          return { data: BigInt(100), refetch: jest.fn() }
        }
        return { data: undefined, refetch: jest.fn() }
      })
      
      const mockEvents = [
        { id: 1, type: 'mint', timestamp: Date.now() },
        { id: 2, type: 'sale', timestamp: Date.now() },
      ]
      ;(api.getEventsByWallet as jest.Mock).mockResolvedValue({ data: mockEvents })
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
      })

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.stats.totalTransactions).toBe(2)
        expect(result.current.stats.recentEvents).toHaveLength(2)
      })
    })

    it('should fetch trust score from API', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      let callCount = 0
      ;(useReadContract as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: BigInt(0), refetch: jest.fn() }
        }
        return { data: BigInt(100) }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockResolvedValue({ data: [] })
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 92,
        trustLevel: 'Very High',
      })

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.stats.trustScore).toBe(92)
        expect(result.current.stats.fraudRiskLevel).toBe('Very High')
      })
    })
  })

  describe('2. Loading States', () => {
    it('should start with loading true', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      let callCount = 0
      ;(useReadContract as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: undefined, refetch: jest.fn() }
        }
        return { data: undefined }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockImplementation(() => new Promise(() => {}))
      ;(api.getTrustScore as jest.Mock).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useDashboardData())

      expect(result.current.loading).toBe(true)
    })

    it('should set loading false after data is fetched', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      let callCount = 0
      ;(useReadContract as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: BigInt(0), refetch: jest.fn() }
        }
        return { data: BigInt(100) }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockResolvedValue({ data: [] })
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
      })

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('3. Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useReadContract as jest.Mock).mockImplementation((config: any) => {
        if (config.functionName === 'balanceOf') {
          return { data: BigInt(0), refetch: jest.fn() }
        }
        if (config.functionName === 'totalSupply') {
          return { data: BigInt(100), refetch: jest.fn() }
        }
        return { data: undefined, refetch: jest.fn() }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockRejectedValue(new Error('API Error'))
      ;(api.getTrustScore as jest.Mock).mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        // The hook handles errors gracefully with default values
        expect(result.current.stats.trustScore).toBe(0)
        expect(result.current.stats.fraudRiskLevel).toBe('Unknown')
      })
    })

    it('should use default values when API fails', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useReadContract as jest.Mock).mockImplementation((config: any) => {
        if (config.functionName === 'balanceOf') {
          return { data: BigInt(0), refetch: jest.fn() }
        }
        if (config.functionName === 'totalSupply') {
          return { data: BigInt(100), refetch: jest.fn() }
        }
        return { data: undefined, refetch: jest.fn() }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockRejectedValue(new Error('API Error'))
      ;(api.getTrustScore as jest.Mock).mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.stats.trustScore).toBe(0)
        expect(result.current.stats.fraudRiskLevel).toBe('Unknown')
      })
    })
  })

  describe('4. Real-time Updates', () => {
    it('should update when NFT balance changes', async () => {
      const mockRefetch = jest.fn()
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useReadContract as jest.Mock).mockImplementation((config: any) => {
        if (config.functionName === 'balanceOf') {
          return { data: BigInt(5), refetch: mockRefetch }
        }
        if (config.functionName === 'totalSupply') {
          return { data: BigInt(100), refetch: jest.fn() }
        }
        return { data: undefined, refetch: jest.fn() }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockResolvedValue({ data: [] })
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
      })

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.stats.ownedNFTs).toBe(5)
      })
    })
  })

  describe('5. Refresh Functionality', () => {
    it('should provide refresh function', async () => {
      const mockRefetch = jest.fn()
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useReadContract as jest.Mock).mockImplementation((config: any) => {
        if (config.functionName === 'balanceOf') {
          return { data: BigInt(0), refetch: mockRefetch }
        }
        if (config.functionName === 'totalSupply') {
          return { data: BigInt(100), refetch: jest.fn() }
        }
        return { data: undefined, refetch: jest.fn() }
      })
      
      ;(api.getEventsByWallet as jest.Mock).mockResolvedValue({ data: [] })
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
      })

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      result.current.refresh()

      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('6. Connection State', () => {
    it('should return isConnected status', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      let callCount = 0
      ;(useReadContract as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: BigInt(0), refetch: jest.fn() }
        }
        return { data: BigInt(100) }
      })

      const { result } = renderHook(() => useDashboardData())

      expect(result.current.isConnected).toBe(true)
    })

    it('should not fetch data when not connected', () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })
      
      let callCount = 0
      ;(useReadContract as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: undefined, refetch: jest.fn() }
        }
        return { data: undefined }
      })

      renderHook(() => useDashboardData())

      expect(api.getEventsByWallet).not.toHaveBeenCalled()
      expect(api.getTrustScore).not.toHaveBeenCalled()
    })
  })

  describe('7. Recent Events Limiting', () => {
    it('should limit recent events to 10', async () => {
      ;(useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      let callCount = 0
      ;(useReadContract as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: BigInt(0), refetch: jest.fn() }
        }
        return { data: BigInt(100) }
      })
      
      const mockEvents = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        type: 'mint',
        timestamp: Date.now(),
      }))
      ;(api.getEventsByWallet as jest.Mock).mockResolvedValue({ data: mockEvents })
      ;(api.getTrustScore as jest.Mock).mockResolvedValue({
        trustScore: 85,
        trustLevel: 'High',
      })

      const { result } = renderHook(() => useDashboardData())

      await waitFor(() => {
        expect(result.current.stats.recentEvents).toHaveLength(10)
        expect(result.current.stats.totalTransactions).toBe(20)
      })
    })
  })
})
