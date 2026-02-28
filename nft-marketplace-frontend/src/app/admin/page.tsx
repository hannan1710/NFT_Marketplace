'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRoles } from '@/hooks/useRoles';
import { Navbar } from '@/components/Navbar';
import { api, SecurityReport } from '@/lib/api';
import { Shield, AlertTriangle, CheckCircle, XCircle, Code, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { isConnected, address, chain } = useAccount();
  const { isAdmin, isMinter, loading } = useRoles();
  const [contractCode, setContractCode] = useState('');
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzeContract = async () => {
    if (!contractCode.trim()) {
      toast.error('Please enter contract code');
      return;
    }

    setAnalyzing(true);
    try {
      const report = await api.validateContract(contractCode);
      setSecurityReport(report);
      toast.success('Security analysis complete');
    } catch (error) {
      toast.error('Failed to analyze contract');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Shield className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access admin panel</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isMinter) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-8">
            <XCircle className="w-16 h-16 text-danger-600 dark:text-danger-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">You don&apos;t have permission to access this page</p>
          </div>
          
          {/* Debug Info */}
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Debug Information</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Connected:</span> {isConnected ? '✅ Yes' : '❌ No'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Address:</span> {address || 'Not connected'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Network:</span> {chain?.name || 'Unknown'} (Chain ID: {chain?.id || 'N/A'})
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Expected Network:</span> Localhost 8545 (Chain ID: 31337)
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Loading Roles:</span> {loading ? '⏳ Yes' : '✅ No'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Is Admin:</span> {isAdmin ? '✅ Yes' : '❌ No'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Is Minter:</span> {isMinter ? '✅ Yes' : '❌ No'}
              </p>
              
              {chain?.id !== 31337 && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    ⚠️ Wrong Network!
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                    Please switch MetaMask to &quot;Localhost 8545&quot; network (Chain ID: 31337)
                  </p>
                </div>
              )}
              
              {chain?.id === 31337 && !isAdmin && !isMinter && !loading && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">
                    💡 Need Admin Access?
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                    Run this command to grant admin role to your address:
                  </p>
                  <code className="block mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                    ADMIN_ADDRESS={address} npx hardhat run scripts/grantAdminToAddress.js --network localhost
                  </code>
                </div>
              )}
            </div>
            
            <div className="mt-6 text-center">
              <a 
                href="/debug" 
                className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
              >
                Go to Debug Page for More Info →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950';
      case 'Medium': return 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950';
      case 'Low': return 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Security analysis and contract validation tools</p>
        </div>

        {/* Role Badges */}
        <div className="flex items-center space-x-3 mb-8">
          {isAdmin && (
            <span className="badge badge-danger">
              <Shield className="w-4 h-4 mr-1" />
              Admin
            </span>
          )}
          {isMinter && (
            <span className="badge badge-info">
              <Code className="w-4 h-4 mr-1" />
              Minter
            </span>
          )}
        </div>

        {/* Contract Analyzer */}
        <div className="card mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Contract Security Analyzer</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contract Source Code
              </label>
              <textarea
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
                placeholder="Paste your Solidity contract code here..."
                className="input font-mono text-sm"
                rows={12}
              />
            </div>

            <button
              onClick={handleAnalyzeContract}
              disabled={analyzing}
              className="btn-primary"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Contract'}
            </button>
          </div>
        </div>

        {/* Security Report */}
        {securityReport && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Issues</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{securityReport.summary.total}</p>
              </div>
              <div className="card text-center bg-danger-50 dark:bg-danger-950">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">High Severity</p>
                <p className="text-3xl font-bold text-danger-600 dark:text-danger-400">{securityReport.summary.high}</p>
              </div>
              <div className="card text-center bg-warning-50 dark:bg-warning-950">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Medium Severity</p>
                <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">{securityReport.summary.medium}</p>
              </div>
              <div className="card text-center bg-primary-50 dark:bg-primary-950">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Low Severity</p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{securityReport.summary.low}</p>
              </div>
            </div>

            {/* Vulnerabilities List */}
            <div className="card">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Detected Vulnerabilities</h3>
              
              {securityReport.vulnerabilities.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-success-600 dark:text-success-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Vulnerabilities Found</h4>
                  <p className="text-gray-600 dark:text-gray-400">The contract passed all security checks</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {securityReport.vulnerabilities.map((vuln, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            vuln.severity === 'High' ? 'text-danger-600 dark:text-danger-400' :
                            vuln.severity === 'Medium' ? 'text-warning-600 dark:text-warning-400' :
                            'text-primary-600 dark:text-primary-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{vuln.type}</h4>
                              <span className={`badge text-xs px-2 py-0.5 ${getSeverityColor(vuln.severity)}`}>
                                {vuln.severity}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{vuln.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="card bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800">
              <div className="flex items-start space-x-3">
                <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Security Recommendations</h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li>• Review all high and medium severity issues before deployment</li>
                    <li>• Consider getting a professional security audit</li>
                    <li>• Test thoroughly on testnet before mainnet deployment</li>
                    <li>• Implement access controls and pausable mechanisms</li>
                    <li>• Use OpenZeppelin&apos;s audited contract libraries</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contract Management</h3>
            <div className="space-y-3">
              <button 
                onClick={() => toast.error('Feature coming soon - Connect to contract to pause')}
                className="w-full btn-outline text-left"
              >
                Pause Contract
              </button>
              <button 
                onClick={() => toast.error('Feature coming soon - Connect to contract to update URI')}
                className="w-full btn-outline text-left"
              >
                Update Base URI
              </button>
              <button 
                onClick={() => toast.error('Feature coming soon - Connect to contract to set royalty')}
                className="w-full btn-outline text-left"
              >
                Set Royalty
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Role Management</h3>
            <div className="space-y-3">
              <button 
                onClick={() => toast.error('Feature coming soon - Connect to contract to grant role')}
                className="w-full btn-outline text-left"
              >
                Grant Minter Role
              </button>
              <button 
                onClick={() => toast.error('Feature coming soon - Connect to contract to revoke role')}
                className="w-full btn-outline text-left"
              >
                Revoke Role
              </button>
              <button 
                onClick={() => toast.error('Feature coming soon - View roles in contract')}
                className="w-full btn-outline text-left"
              >
                View All Roles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
