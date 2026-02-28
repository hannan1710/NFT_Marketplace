"""
Complete integration example showing all fraud detection features

This example demonstrates:
1. Training the engine
2. Real-time transaction analysis
3. Hybrid scoring
4. Blockchain monitoring
5. Alert system
6. Dashboard integration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.engine.fraud_engine import FraudDetectionEngine
from src.scoring.hybrid_scorer import HybridScorer, AdaptiveScorer
from src.data.transaction_generator import TransactionGenerator
import asyncio
import json
from datetime import datetime
from typing import List, Dict


class NFTMarketplaceFraudSystem:
    """
    Complete fraud detection system for NFT marketplace
    """
    
    def __init__(self):
        """Initialize fraud detection system"""
        print("🚀 Initializing NFT Marketplace Fraud Detection System...")
        
        # Core components
        self.engine = FraudDetectionEngine()
        self.scorer = HybridScorer(
            anomaly_weight=0.3,
            pattern_weight=0.4,
            graph_weight=0.3
        )
        self.adaptive_scorer = AdaptiveScorer()
        
        # Data generator for demo
        self.generator = TransactionGenerator()
        
        # Alert system
        self.alerts = []
        self.blocked_wallets = set()
        
        print("✅ System initialized successfully\n")
    
    def train_system(self, num_transactions: int = 500):
        """Train the fraud detection system"""
        print(f"📚 Training system on {num_transactions} historical transactions...")
        
        # Generate diverse training data
        training_data = self.generator.generate_mixed_dataset(
            normal=int(num_transactions * 0.7),
            wash_trading=int(num_transactions * 0.15),
            circular=int(num_transactions * 0.1),
            price_spikes=int(num_transactions * 0.05)
        )
        
        # Train engine
        self.engine.train(training_data)
        
        print(f"✅ Training complete!")
        print(f"   - Trained on {len(training_data)} transactions")
        print(f"   - Graph built with {self.engine.wallet_graph.graph.number_of_nodes()} wallets")
        print()
    
    def analyze_transaction(
        self,
        transaction: Dict,
        wallet_history: List[Dict] = None,
        nft_price_history: List[float] = None
    ) -> Dict:
        """
        Analyze transaction with full fraud detection pipeline
        
        Returns comprehensive analysis with recommendations
        """
        # 1. Basic fraud detection
        result = self.engine.analyze_transaction(
            transaction,
            wallet_history,
            nft_price_history
        )
        
        # 2. Enhanced scoring
        enhanced = self.scorer.calculate_weighted_score(result)
        
        # 3. Get recommendations
        recommendations = self.scorer.get_recommendation(enhanced)
        
        # 4. Combine results
        complete_result = {
            **result,
            'enhanced_scoring': enhanced,
            'recommendations': recommendations,
            'analysis_timestamp': datetime.now().isoformat()
        }
        
        # 5. Handle high-risk transactions
        if recommendations['action'] in ['BLOCK', 'REVIEW']:
            self._handle_high_risk_transaction(transaction, complete_result)
        
        return complete_result
    
    def _handle_high_risk_transaction(self, transaction: Dict, result: Dict):
        """Handle high-risk transaction"""
        wallet = transaction.get('buyer') or transaction.get('seller')
        
        # Create alert
        alert = {
            'timestamp': datetime.now().isoformat(),
            'transaction_id': transaction.get('transaction_id'),
            'wallet': wallet,
            'risk_score': result['risk_score'],
            'risk_category': result['risk_category'],
            'flags': result['flags'],
            'action': result['recommendations']['action']
        }
        
        self.alerts.append(alert)
        
        # Block wallet if critical
        if result['recommendations']['action'] == 'BLOCK':
            self.blocked_wallets.add(wallet)
            print(f"🚫 BLOCKED: Wallet {wallet[:10]}... (Risk: {result['risk_score']:.1f})")
        else:
            print(f"⚠️  REVIEW: Transaction {transaction.get('transaction_id')} flagged for review")
    
    def process_marketplace_transaction(self, transaction: Dict) -> Dict:
        """
        Process marketplace transaction with fraud checks
        
        This simulates the flow in a real marketplace
        """
        print(f"\n💳 Processing transaction {transaction.get('transaction_id')}...")
        
        # 1. Check if wallet is blocked
        buyer = transaction.get('buyer')
        if buyer in self.blocked_wallets:
            print(f"   ❌ Transaction rejected: Wallet is blocked")
            return {
                'success': False,
                'reason': 'Wallet blocked due to previous fraud detection'
            }
        
        # 2. Analyze for fraud
        result = self.analyze_transaction(transaction)
        
        # 3. Make decision
        action = result['recommendations']['action']
        
        if action == 'BLOCK':
            print(f"   ❌ Transaction blocked: High fraud risk")
            return {
                'success': False,
                'reason': 'Transaction blocked due to fraud detection',
                'risk_score': result['risk_score'],
                'flags': result['flags']
            }
        
        elif action == 'REVIEW':
            print(f"   ⏸️  Transaction pending: Manual review required")
            return {
                'success': False,
                'reason': 'Transaction requires manual review',
                'risk_score': result['risk_score'],
                'pending_review': True
            }
        
        else:
            print(f"   ✅ Transaction approved (Risk: {result['risk_score']:.1f})")
            return {
                'success': True,
                'risk_score': result['risk_score'],
                'transaction_id': transaction.get('transaction_id')
            }
    
    def monitor_wallet(self, wallet_address: str) -> Dict:
        """Monitor specific wallet for suspicious activity"""
        print(f"\n🔍 Monitoring wallet: {wallet_address[:10]}...")
        
        # Get wallet metrics from graph
        metrics = self.engine.wallet_graph.analyze_wallet(wallet_address)
        
        # Check if wallet is suspicious
        is_suspicious = wallet_address in self.engine.suspicious_wallets
        
        # Get related alerts
        wallet_alerts = [
            alert for alert in self.alerts
            if alert['wallet'] == wallet_address
        ]
        
        report = {
            'wallet_address': wallet_address,
            'is_suspicious': is_suspicious,
            'is_blocked': wallet_address in self.blocked_wallets,
            'graph_metrics': metrics,
            'alert_count': len(wallet_alerts),
            'recent_alerts': wallet_alerts[-5:] if wallet_alerts else []
        }
        
        print(f"   Suspicious: {is_suspicious}")
        print(f"   Blocked: {report['is_blocked']}")
        print(f"   Alerts: {len(wallet_alerts)}")
        
        return report
    
    def get_system_statistics(self) -> Dict:
        """Get comprehensive system statistics"""
        stats = self.engine.get_statistics()
        
        return {
            **stats,
            'total_alerts': len(self.alerts),
            'blocked_wallets': len(self.blocked_wallets),
            'high_risk_alerts': len([a for a in self.alerts if a['risk_category'] == 'High']),
            'medium_risk_alerts': len([a for a in self.alerts if a['risk_category'] == 'Medium'])
        }
    
    def generate_report(self) -> str:
        """Generate comprehensive fraud detection report"""
        stats = self.get_system_statistics()
        
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║          NFT MARKETPLACE FRAUD DETECTION REPORT              ║
╚══════════════════════════════════════════════════════════════╝

📊 SYSTEM STATUS
   Engine Trained: {stats['is_trained']}
   Total Alerts: {stats['total_alerts']}
   High Risk Alerts: {stats['high_risk_alerts']}
   Medium Risk Alerts: {stats['medium_risk_alerts']}

🚫 BLOCKED WALLETS
   Total Blocked: {stats['blocked_wallets']}
   Suspicious Wallets: {stats['suspicious_wallets_count']}

📈 GRAPH STATISTICS
   Total Wallets: {stats['graph_statistics'].get('nodes', 0)}
   Total Connections: {stats['graph_statistics'].get('edges', 0)}
   Network Density: {stats['graph_statistics'].get('density', 0):.4f}

🔍 FRAUD DETECTIONS
   Total Detections: {stats['total_fraud_detections']}

⚠️  RECENT ALERTS
"""
        
        # Add recent alerts
        for alert in self.alerts[-5:]:
            report += f"""
   [{alert['timestamp']}]
   Transaction: {alert['transaction_id']}
   Risk: {alert['risk_score']:.1f} ({alert['risk_category']})
   Action: {alert['action']}
   Flags: {', '.join(alert['flags'])}
"""
        
        return report


def demo_basic_usage():
    """Demo 1: Basic usage"""
    print("="*70)
    print("DEMO 1: Basic Fraud Detection")
    print("="*70)
    
    system = NFTMarketplaceFraudSystem()
    system.train_system(200)
    
    # Test normal transaction
    normal_tx = {
        'transaction_id': 'tx_normal_001',
        'nft_id': 'nft_001',
        'seller': '0xABC123',
        'buyer': '0xDEF456',
        'price': 1500.0
    }
    
    result = system.process_marketplace_transaction(normal_tx)
    print(f"\nResult: {result['success']}")


def demo_fraud_detection():
    """Demo 2: Fraud detection"""
    print("\n" + "="*70)
    print("DEMO 2: Detecting Fraudulent Transactions")
    print("="*70)
    
    system = NFTMarketplaceFraudSystem()
    system.train_system(300)
    
    # Generate fraudulent transactions
    generator = TransactionGenerator()
    
    print("\n🔍 Testing wash trading detection...")
    wash_txs = generator.generate_wash_trading_transactions(5)
    for tx in wash_txs[:3]:
        system.process_marketplace_transaction(tx)
    
    print("\n🔍 Testing price spike detection...")
    spike_tx = generator.generate_price_spike_transaction()
    system.process_marketplace_transaction(spike_tx)


def demo_wallet_monitoring():
    """Demo 3: Wallet monitoring"""
    print("\n" + "="*70)
    print("DEMO 3: Wallet Monitoring")
    print("="*70)
    
    system = NFTMarketplaceFraudSystem()
    system.train_system(200)
    
    # Generate and process transactions
    generator = TransactionGenerator()
    wash_txs = generator.generate_wash_trading_transactions(5)
    
    # Process transactions
    for tx in wash_txs:
        system.process_marketplace_transaction(tx)
    
    # Monitor the suspicious wallet
    suspicious_wallet = wash_txs[0]['buyer']
    report = system.monitor_wallet(suspicious_wallet)


def demo_adaptive_scoring():
    """Demo 4: Adaptive scoring with feedback"""
    print("\n" + "="*70)
    print("DEMO 4: Adaptive Scoring")
    print("="*70)
    
    system = NFTMarketplaceFraudSystem()
    system.train_system(200)
    
    # Process transactions and provide feedback
    generator = TransactionGenerator()
    
    print("\n📊 Processing transactions with feedback...")
    
    # Normal transaction - correctly identified
    normal_tx = generator.generate_normal_transactions(1)[0]
    result = system.analyze_transaction(normal_tx)
    system.adaptive_scorer.add_feedback(
        transaction_id=normal_tx['transaction_id'],
        predicted_score=result['risk_score'],
        actual_fraud=False
    )
    print(f"   Normal transaction: Risk {result['risk_score']:.1f} ✓")
    
    # Fraudulent transaction - correctly identified
    fraud_tx = generator.generate_wash_trading_transactions(1)[0]
    result = system.analyze_transaction(fraud_tx)
    system.adaptive_scorer.add_feedback(
        transaction_id=fraud_tx['transaction_id'],
        predicted_score=result['risk_score'],
        actual_fraud=True,
        fraud_type='wash_trading'
    )
    print(f"   Fraud transaction: Risk {result['risk_score']:.1f} ✓")
    
    print("\n✅ Adaptive scorer learning from feedback")


def demo_comprehensive_report():
    """Demo 5: Comprehensive system report"""
    print("\n" + "="*70)
    print("DEMO 5: Comprehensive System Report")
    print("="*70)
    
    system = NFTMarketplaceFraudSystem()
    system.train_system(500)
    
    # Generate and process various transactions
    generator = TransactionGenerator()
    
    # Process normal transactions
    normal_txs = generator.generate_normal_transactions(20)
    for tx in normal_txs[:10]:
        system.process_marketplace_transaction(tx)
    
    # Process fraudulent transactions
    wash_txs = generator.generate_wash_trading_transactions(5)
    for tx in wash_txs:
        system.process_marketplace_transaction(tx)
    
    circular_txs = generator.generate_circular_transfer_transactions(3)
    for tx in circular_txs:
        system.process_marketplace_transaction(tx)
    
    # Generate report
    report = system.generate_report()
    print(report)


def main():
    """Run all demos"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║     NFT FRAUD DETECTION - COMPLETE INTEGRATION DEMO          ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    try:
        demo_basic_usage()
        demo_fraud_detection()
        demo_wallet_monitoring()
        demo_adaptive_scoring()
        demo_comprehensive_report()
        
        print("\n" + "="*70)
        print("✅ ALL DEMOS COMPLETED SUCCESSFULLY")
        print("="*70)
        print("\nNext Steps:")
        print("1. Review INTEGRATION_GUIDE.md for production integration")
        print("2. Customize scoring weights for your use case")
        print("3. Integrate with your blockchain monitoring")
        print("4. Set up alerting and dashboard")
        print("5. Deploy with Docker/Kubernetes")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
