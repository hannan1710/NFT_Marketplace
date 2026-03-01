import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Shield, TrendingUp, AlertTriangle, Zap, Lock, BarChart3, Sparkles, Rocket, Star } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />
      
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center space-x-2 bg-primary-100 dark:bg-primary-900/30 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-xs sm:text-sm font-semibold text-primary-700 dark:text-primary-300">AI-Powered NFT Platform</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight px-4">
            The Future of
            <span className="block bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent animate-glow">
              Secure NFT Trading
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4">
            AI-powered marketplace with fraud detection, price prediction, and trust scoring.
            Trade with confidence on the most secure NFT platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 px-4">
            <Link href="/marketplace" prefetch={true} className="w-full sm:w-auto btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center space-x-2 group">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              <span>Explore Marketplace</span>
            </Link>
            <Link href="/dashboard" prefetch={true} className="w-full sm:w-auto btn-outline text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center space-x-2 group">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              <span>View Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mt-12 sm:mt-16 lg:mt-20">
          <StatCard title="Total Volume" value="12,450 ETH" change="+15.3%" icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />} />
          <StatCard title="Active Listings" value="3,247" change="+8.2%" icon={<Star className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />} />
          <StatCard title="Fraud Detected" value="127" change="-12.5%" isNegative icon={<Shield className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />} />
          <StatCard title="Avg Trust Score" value="87/100" change="+3.1%" icon={<Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />} />
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-4">
            Why Choose Our Marketplace?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 px-4">
            Advanced AI and blockchain technology working together for your security
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <FeatureCard
            icon={<Shield className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary-600 dark:text-primary-400" />}
            title="Trust Score System"
            description="Dynamic wallet reputation scoring based on transaction history, disputes, and behavioral patterns."
            gradient="from-primary-500 to-blue-500"
          />
          <FeatureCard
            icon={<AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-warning-600 dark:text-warning-400" />}
            title="AI Fraud Detection"
            description="Real-time fraud analysis using machine learning to detect wash trading, price manipulation, and suspicious patterns."
            gradient="from-warning-500 to-orange-500"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-success-600 dark:text-success-400" />}
            title="Price Prediction"
            description="ML-powered price predictions with confidence scores to help you make informed trading decisions."
            gradient="from-success-500 to-green-500"
          />
          <FeatureCard
            icon={<Lock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-purple-600 dark:text-purple-400" />}
            title="Smart Contract Security"
            description="Automated security analysis of all contracts with vulnerability detection and severity classification."
            gradient="from-purple-500 to-pink-500"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-600 dark:text-yellow-400" />}
            title="Gas Optimization"
            description="Optimized smart contracts and batch operations to minimize transaction costs."
            gradient="from-yellow-500 to-amber-500"
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-600 dark:text-blue-400" />}
            title="Advanced Analytics"
            description="Comprehensive dashboard with real-time metrics, event tracking, and performance insights."
            gradient="from-blue-500 to-cyan-500"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-700 dark:to-purple-700 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-4">
            Ready to Start Trading?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-primary-100 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Connect your wallet and experience the most secure NFT marketplace powered by AI
          </p>
          <Link href="/marketplace" className="inline-flex items-center space-x-2 bg-white text-primary-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Get Started Now</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8 sm:py-10 md:py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                <span>SecureNFT Hub</span>
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                Secure, AI-powered NFT trading platform
              </p>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Marketplace</h4>
              <ul className="space-y-2 text-sm sm:text-base text-gray-400">
                <li><Link href="/marketplace" className="hover:text-white transition-colors">Explore</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Resources</h4>
              <ul className="space-y-2 text-sm sm:text-base text-gray-400">
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Legal</h4>
              <ul className="space-y-2 text-sm sm:text-base text-gray-400">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-sm sm:text-base text-gray-400">
            <p>&copy; 2024 SecureNFT Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ title, value, change, isNegative = false, icon }: { title: string; value: string; change: string; isNegative?: boolean; icon: React.ReactNode }) {
  return (
    <div className="card text-center hover:scale-105 transition-transform duration-300">
      <div className="flex justify-center mb-2 sm:mb-3 text-primary-600 dark:text-primary-400">
        {icon}
      </div>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">{title}</p>
      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{value}</p>
      <p className={`text-xs sm:text-sm font-medium ${isNegative ? 'text-danger-600 dark:text-danger-400' : 'text-success-600 dark:text-success-400'}`}>
        {change}
      </p>
    </div>
  );
}

function FeatureCard({ icon, title, description, gradient }: { icon: React.ReactNode; title: string; description: string; gradient: string }) {
  return (
    <div className="card hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      <div className="relative">
        <div className="mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{title}</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}
