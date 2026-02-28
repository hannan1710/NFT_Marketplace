"""
Example usage of NFT Fraud Detection Engine

Demonstrates all features:
- Training the engine
- Analyzing transactions
- Detecting various fraud types
- Using the API
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.engine.fraud_engine import FraudDetectionEngine
from src.data.transaction_generator import TransactionGenerator
import requests
import json


def example_1_basic_usage():
    """Example 1: Basic fraud detection"""
    print("\n" + "="*60)
    print("EXAMPLE 1: Basic Fraud Detection")
    print("="*60)
    
    # Initialize engine
    engine = FraudDetectionEngine()
    generator = TransactionGenerator()
    
    # Generate training data
    print("\n1. Generating training data...")
    training_data = generator.generate_mixed_dataset(
        normal=100,
        wash_trading=20,
        circular=10,
        price_spikes=5
    )
    print(f"   Generated {len(training_data)} transactions")
    
    # Train engine
    print("\n2. Training fraud detection engine...")
    engine.train(training_data)
    print("   ✓ Engine trained successfully")
    
    # Analyze a transaction
    print("\n3. Analyzing a transaction...")
    test_transaction = {
        'transaction_id': 'tx_001',
        'nft_id': 'nft_001',
        'seller': '0xABC123',
        'buyer': '0xDEF456',
        'price': 1500.0,
        'timestamp': 1640000000
    }
    
    result = engine.analyze_transaction(test_transaction)
    
    print(f"\n   Transaction ID: {result['transaction_id']}")
    print(f"   Risk Score: {result['risk_score']:.1f}/100")
    print(f"   Risk Category: {result['risk_category']}")
    print(f"   Fraud Detected: {result['fraud_detected']}")
    print(f"   Flags: {', '.join(result['flags']) if result['flags'] else 'None'}")


def example_2_wash_trading_detection():
    """Example 2: Wash trading detection"""
    print("\n" + "="*60)
    print("EXAMPLE 2: Wash Trading Detection")
    print("="*60)
    
    engine = FraudDetectionEngine()
    generator = TransactionGenerator()
    
    # Train
    training_data = generator.generate_normal_transactions(100)
    engine.train(training_data)
    
    # Generate wash trading transactions
    print("\n1. Generating wash trading pattern...")
    wash_txs = generator.generate_wash_trading_transactions(5)
    wallet = wash_txs[0]['buyer']
    print(f"   Wallet {wallet} buying/selling same NFT repeatedly")
    
    # Analyze with history
    print("\n2. Analyzing transaction with wallet history...")
    result = engine.analyze_transaction(
        wash_txs[-1],
        wallet_history=wash_txs
    )
    
    print(f"\n   Risk Score: {result['risk_score']:.1f}/100")
    print(f"   Risk Category: {result['risk_category']}")
    
    if 'wash_trading' in result['pattern_detection']:
        wash_info = result['pattern_detection']['wash_trading']
        print(f"   Wash Trading Detected: {wash_info['detected']}")
        print(f"   Confidence: {wash_info['confidence']:.2f}")
        if wash_info.get('details'):
            print(f"   Details: {wash_info['details']}")


def example_3_circular_transfers():
    """Example 3: Circular transfer detection"""
    print("\n" + "="*60)
    print("EXAMPLE 3: Circular Transfer Detection")
    print("="*60)
    
    engine = FraudDetectionEngine()
    generator = TransactionGenerator()
    
    # Train
    training_data = generator.generate_normal_transactions(100)
    engine.train(training_data)
    
    # Generate circular transactions
    print("\n1. Generating circular transfer pattern...")
    circular_txs = generator.generate_circular_transfer_transactions(4)
    print(f"   NFT transferred through {len(circular_txs)} wallets in a circle")
    
    # Analyze
    print("\n2. Analyzing circular pattern...")
    result = engine.analyze_transaction(
        circular_txs[-1],
        wallet_history=circular_txs
    )
    
    print(f"\n   Risk Score: {result['risk_score']:.1f}/100")
    print(f"   Risk Category: {result['risk_category']}")
    
    if 'circular_transfers' in result['pattern_detection']:
        circular_info = result['pattern_detection']['circular_transfers']
        print(f"   Circular Transfer Detected: {circular_info['detected']}")
        print(f"   Confidence: {circular_info['confidence']:.2f}")


def example_4_price_spike_detection():
    """Example 4: Price spike detection"""
    print("\n" + "="*60)
    print("EXAMPLE 4: Price Spike Detection")
    print("="*60)
    
    engine = FraudDetectionEngine()
    generator = TransactionGenerator()
    
    # Train
    training_data = generator.generate_normal_transactions(100)
    engine.train(training_data)
    
    # Create price history with spike
    print("\n1. Creating price history with spike...")
    price_history = [1000, 1100, 1050, 1200, 1150]
    print(f"   Historical prices: {price_history}")
    
    spike_transaction = {
        'nft_id': 'nft_001',
        'seller': '0xABC123',
        'buyer': '0xDEF456',
        'price': 5000.0,  # 4x spike!
        'timestamp': 1640000000
    }
    print(f"   Current price: {spike_transaction['price']} (4x spike!)")
    
    # Analyze
    print("\n2. Analyzing price spike...")
    result = engine.analyze_transaction(
        spike_transaction,
        nft_price_history=price_history
    )
    
    print(f"\n   Risk Score: {result['risk_score']:.1f}/100")
    print(f"   Risk Category: {result['risk_category']}")
    
    if 'price_spike' in result['pattern_detection']:
        spike_info = result['pattern_detection']['price_spike']
        print(f"   Price Spike Detected: {spike_info['detected']}")
        print(f"   Confidence: {spike_info['confidence']:.2f}")


def example_5_graph_analysis():
    """Example 5: Graph-based analysis"""
    print("\n" + "="*60)
    print("EXAMPLE 5: Graph-Based Wallet Analysis")
    print("="*60)
    
    engine = FraudDetectionEngine()
    generator = TransactionGenerator()
    
    # Generate and train
    print("\n1. Building wallet transaction graph...")
    training_data = generator.generate_mixed_dataset(
        normal=100,
        wash_trading=20,
        circular=10
    )
    engine.train(training_data)
    print("   ✓ Graph built with wallet relationships")
    
    # Analyze with graph
    print("\n2. Analyzing wallet using graph metrics...")
    test_tx = training_data[0]
    result = engine.analyze_transaction(test_tx)
    
    if 'graph_analysis' in result:
        graph_info = result['graph_analysis']
        
        if 'metrics' in graph_info:
            print("\n   Graph Metrics:")
            for metric, value in graph_info['metrics'].items():
                print(f"   - {metric}: {value}")
        
        if 'circular_patterns' in graph_info:
            circular = graph_info['circular_patterns']
            print(f"\n   Circular Patterns Detected: {circular['detected']}")
            if circular['detected']:
                print(f"   Pattern Count: {circular['count']}")
        
        if 'sybil_cluster' in graph_info:
            sybil = graph_info['sybil_cluster']
            print(f"\n   Sybil Cluster Detected: {sybil['is_sybil_cluster']}")


def example_6_statistics():
    """Example 6: System statistics"""
    print("\n" + "="*60)
    print("EXAMPLE 6: System Statistics")
    print("="*60)
    
    engine = FraudDetectionEngine()
    generator = TransactionGenerator()
    
    # Train and analyze
    print("\n1. Training and analyzing transactions...")
    training_data = generator.generate_mixed_dataset(
        normal=100,
        wash_trading=20,
        circular=10,
        price_spikes=5
    )
    engine.train(training_data)
    
    # Analyze multiple transactions
    test_txs = generator.generate_wash_trading_transactions(10)
    for tx in test_txs:
        engine.analyze_transaction(tx, wallet_history=test_txs)
    
    # Get statistics
    print("\n2. System Statistics:")
    stats = engine.get_statistics()
    
    print(f"\n   Engine Trained: {stats['is_trained']}")
    print(f"   Suspicious Wallets: {stats['suspicious_wallets_count']}")
    print(f"   Total Fraud Detections: {stats['total_fraud_detections']}")
    
    if 'graph_statistics' in stats:
        graph_stats = stats['graph_statistics']
        print(f"\n   Graph Statistics:")
        for key, value in graph_stats.items():
            print(f"   - {key}: {value}")
    
    # Get suspicious wallets
    print("\n3. Suspicious Wallets:")
    wallets = engine.get_suspicious_wallets()
    if wallets:
        for wallet in wallets[:5]:  # Show first 5
            print(f"   - {wallet}")
    else:
        print("   No suspicious wallets detected")
    
    # Get fraud log
    print("\n4. Recent Fraud Detections:")
    fraud_log = engine.get_fraud_log(limit=5)
    for entry in fraud_log:
        print(f"   - {entry['wallet_address']}: Risk {entry['risk_score']:.1f} ({entry['risk_category']})")


def example_7_api_usage():
    """Example 7: Using the REST API"""
    print("\n" + "="*60)
    print("EXAMPLE 7: REST API Usage")
    print("="*60)
    print("\nNOTE: This requires the API server to be running.")
    print("Start server with: uvicorn src.api.main:app --reload")
    print("\nSkipping API examples (server not guaranteed to be running)")
    print("\nAPI Usage Examples:")
    
    print("\n1. Health Check:")
    print("   GET http://localhost:8000/health")
    
    print("\n2. Train Engine:")
    print("   POST http://localhost:8000/train")
    print("   Body: {\"transactions\": [...]}")
    
    print("\n3. Calculate Risk Score:")
    print("   POST http://localhost:8000/risk-score")
    print("   Body: {")
    print("     \"transaction\": {")
    print("       \"nft_id\": \"nft_001\",")
    print("       \"seller\": \"0xABC123\",")
    print("       \"buyer\": \"0xDEF456\",")
    print("       \"price\": 1500.0")
    print("     }")
    print("   }")
    
    print("\n4. Get Suspicious Wallets:")
    print("   GET http://localhost:8000/suspicious-wallets")
    
    print("\n5. Get Statistics:")
    print("   GET http://localhost:8000/statistics")


def example_8_comprehensive_analysis():
    """Example 8: Comprehensive fraud analysis"""
    print("\n" + "="*60)
    print("EXAMPLE 8: Comprehensive Fraud Analysis")
    print("="*60)
    
    engine = FraudDetectionEngine()
    generator = TransactionGenerator()
    
    # Train
    print("\n1. Training on diverse dataset...")
    training_data = generator.generate_mixed_dataset(
        normal=200,
        wash_trading=30,
        circular=15,
        price_spikes=10
    )
    engine.train(training_data)
    print(f"   ✓ Trained on {len(training_data)} transactions")
    
    # Test different fraud scenarios
    print("\n2. Testing fraud detection across scenarios...")
    
    scenarios = [
        ("Normal Transaction", generator.generate_normal_transactions(1)[0], []),
        ("Wash Trading", generator.generate_wash_trading_transactions(5)[-1], 
         generator.generate_wash_trading_transactions(5)),
        ("Circular Transfer", generator.generate_circular_transfer_transactions(4)[-1],
         generator.generate_circular_transfer_transactions(4)),
        ("Rapid Flipping", generator.generate_rapid_flipping_transactions(3)[-1],
         generator.generate_rapid_flipping_transactions(3))
    ]
    
    print("\n   Results:")
    print("   " + "-"*56)
    print(f"   {'Scenario':<20} {'Risk Score':<12} {'Category':<10} {'Flags'}")
    print("   " + "-"*56)
    
    for scenario_name, tx, history in scenarios:
        result = engine.analyze_transaction(tx, wallet_history=history)
        flags_str = ', '.join(result['flags'][:2]) if result['flags'] else 'None'
        if len(flags_str) > 20:
            flags_str = flags_str[:17] + "..."
        print(f"   {scenario_name:<20} {result['risk_score']:>6.1f}/100   {result['risk_category']:<10} {flags_str}")
    
    print("   " + "-"*56)
    
    # Summary
    print("\n3. Detection Summary:")
    stats = engine.get_statistics()
    print(f"   Total Suspicious Wallets: {stats['suspicious_wallets_count']}")
    print(f"   Total Fraud Detections: {stats['total_fraud_detections']}")


def main():
    """Run all examples"""
    print("\n" + "="*60)
    print("NFT FRAUD DETECTION ENGINE - EXAMPLE USAGE")
    print("="*60)
    
    try:
        example_1_basic_usage()
        example_2_wash_trading_detection()
        example_3_circular_transfers()
        example_4_price_spike_detection()
        example_5_graph_analysis()
        example_6_statistics()
        example_7_api_usage()
        example_8_comprehensive_analysis()
        
        print("\n" + "="*60)
        print("ALL EXAMPLES COMPLETED SUCCESSFULLY")
        print("="*60)
        print("\nNext Steps:")
        print("1. Start API server: uvicorn src.api.main:app --reload")
        print("2. Run tests: pytest tests/ -v")
        print("3. View API docs: http://localhost:8000/docs")
        print("4. Integrate with your NFT platform")
        print()
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
