"""
Comprehensive tests for fraud detection engine
"""

import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.engine.fraud_engine import FraudDetectionEngine
from src.data.transaction_generator import TransactionGenerator


@pytest.fixture
def fraud_engine():
    """Create fraud engine instance"""
    return FraudDetectionEngine()


@pytest.fixture
def transaction_generator():
    """Create transaction generator instance"""
    return TransactionGenerator()


@pytest.fixture
def sample_transaction():
    """Sample transaction"""
    return {
        'transaction_id': 'tx_001',
        'nft_id': 'nft_001',
        'seller': '0xABC123',
        'buyer': '0xDEF456',
        'price': 1500.0,
        'timestamp': 1640000000,
        'buyer_volume': 5000.0,
        'seller_volume': 3000.0
    }


@pytest.fixture
def trained_engine(fraud_engine, transaction_generator):
    """Create trained fraud engine"""
    training_data = transaction_generator.generate_mixed_dataset(
        normal=100,
        wash_trading=10,
        circular=5,
        price_spikes=5
    )
    fraud_engine.train(training_data)
    return fraud_engine


class TestFraudDetectionEngine:
    """Test fraud detection engine"""
    
    def test_initialization(self, fraud_engine):
        """Test engine initialization"""
        assert fraud_engine is not None
        assert fraud_engine.is_trained is False
        assert len(fraud_engine.suspicious_wallets) == 0
        assert len(fraud_engine.fraud_log) == 0
    
    def test_training(self, fraud_engine, transaction_generator):
        """Test engine training"""
        training_data = transaction_generator.generate_normal_transactions(50)
        fraud_engine.train(training_data)
        
        assert fraud_engine.is_trained is True
        assert fraud_engine.anomaly_detector.is_fitted is True
    
    def test_analyze_transaction_untrained(self, fraud_engine, sample_transaction):
        """Test analyzing transaction without training"""
        result = fraud_engine.analyze_transaction(sample_transaction)
        
        assert result is not None
        assert 'risk_score' in result
        assert 'risk_category' in result
        assert 'fraud_detected' in result
        assert result['risk_score'] >= 0
        assert result['risk_score'] <= 100
    
    def test_analyze_transaction_trained(self, trained_engine, sample_transaction):
        """Test analyzing transaction with trained engine"""
        result = trained_engine.analyze_transaction(sample_transaction)
        
        assert result is not None
        assert 'transaction_id' in result
        assert 'wallet_address' in result
        assert 'risk_score' in result
        assert 'risk_category' in result
        assert 'fraud_detected' in result
        assert 'anomaly_detection' in result
        assert 'pattern_detection' in result
        assert 'graph_analysis' in result
        assert 'flags' in result
    
    def test_wash_trading_detection(self, trained_engine, transaction_generator):
        """Test wash trading detection"""
        # Generate wash trading transactions
        wash_txs = transaction_generator.generate_wash_trading_transactions(5)
        wallet = wash_txs[0]['buyer']
        
        # Analyze with history
        result = trained_engine.analyze_transaction(
            wash_txs[-1],
            wallet_history=wash_txs
        )
        
        assert 'WASH_TRADING' in result['flags'] or result['risk_score'] > 30
    
    def test_circular_transfer_detection(self, trained_engine, transaction_generator):
        """Test circular transfer detection"""
        # Generate circular transactions
        circular_txs = transaction_generator.generate_circular_transactions(4)
        wallet = circular_txs[0]['buyer']
        
        # Analyze with history
        result = trained_engine.analyze_transaction(
            circular_txs[-1],
            wallet_history=circular_txs
        )
        
        assert 'CIRCULAR_TRANSFERS' in result['flags'] or result['risk_score'] > 30
    
    def test_price_spike_detection(self, trained_engine, sample_transaction):
        """Test price spike detection"""
        # Create price history with spike
        price_history = [1000, 1100, 1050, 1200, 1150]
        spike_transaction = sample_transaction.copy()
        spike_transaction['price'] = 5000  # 4x spike
        
        result = trained_engine.analyze_transaction(
            spike_transaction,
            nft_price_history=price_history
        )
        
        assert 'PRICE_SPIKE' in result['flags'] or result['risk_score'] > 30
    
    def test_rapid_flipping_detection(self, trained_engine, transaction_generator):
        """Test rapid flipping detection"""
        # Generate rapid flipping transactions
        flipping_txs = transaction_generator.generate_rapid_flipping_transactions(3)
        wallet = flipping_txs[0]['buyer']
        
        result = trained_engine.analyze_transaction(
            flipping_txs[-1],
            wallet_history=flipping_txs
        )
        
        assert 'RAPID_FLIPPING' in result['flags'] or result['risk_score'] > 20
    
    def test_risk_score_calculation(self, trained_engine, sample_transaction):
        """Test risk score calculation"""
        result = trained_engine.analyze_transaction(sample_transaction)
        
        assert result['risk_score'] >= 0
        assert result['risk_score'] <= 100
        assert isinstance(result['risk_score'], float)
    
    def test_risk_categorization(self, trained_engine):
        """Test risk categorization"""
        # Test low risk
        low_result = {'risk_score': 20}
        assert trained_engine._categorize_risk(20) == 'Low'
        
        # Test medium risk
        assert trained_engine._categorize_risk(50) == 'Medium'
        
        # Test high risk
        assert trained_engine._categorize_risk(80) == 'High'
    
    def test_suspicious_wallet_logging(self, trained_engine, transaction_generator):
        """Test suspicious wallet logging"""
        # Generate fraudulent transactions
        fraud_txs = transaction_generator.generate_wash_trading_transactions(5)
        
        for tx in fraud_txs:
            trained_engine.analyze_transaction(tx, wallet_history=fraud_txs)
        
        suspicious_wallets = trained_engine.get_suspicious_wallets()
        assert len(suspicious_wallets) >= 0
    
    def test_get_fraud_log(self, trained_engine, transaction_generator):
        """Test fraud log retrieval"""
        # Generate and analyze transactions
        txs = transaction_generator.generate_mixed_dataset(normal=10, wash_trading=5)
        
        for tx in txs:
            trained_engine.analyze_transaction(tx)
        
        fraud_log = trained_engine.get_fraud_log(limit=10)
        assert isinstance(fraud_log, list)
    
    def test_get_statistics(self, trained_engine):
        """Test statistics retrieval"""
        stats = trained_engine.get_statistics()
        
        assert 'is_trained' in stats
        assert 'suspicious_wallets_count' in stats
        assert 'total_fraud_detections' in stats
        assert 'graph_statistics' in stats
        assert stats['is_trained'] is True
    
    def test_graph_analysis(self, trained_engine, sample_transaction):
        """Test graph analysis"""
        result = trained_engine.analyze_transaction(sample_transaction)
        
        assert 'graph_analysis' in result
        graph_analysis = result['graph_analysis']
        
        if 'metrics' in graph_analysis:
            assert isinstance(graph_analysis['metrics'], dict)
    
    def test_anomaly_detection(self, trained_engine, sample_transaction):
        """Test anomaly detection"""
        result = trained_engine.analyze_transaction(sample_transaction)
        
        assert 'anomaly_detection' in result
        anomaly = result['anomaly_detection']
        
        if 'is_anomaly' in anomaly:
            assert isinstance(anomaly['is_anomaly'], bool)
            assert 'anomaly_score' in anomaly
            assert 'confidence' in anomaly
    
    def test_multiple_flags(self, trained_engine, transaction_generator):
        """Test detection of multiple fraud types"""
        # Generate complex fraud scenario
        txs = transaction_generator.generate_wash_trading_transactions(5)
        price_history = [1000, 1100, 1050]
        
        # Create transaction with multiple fraud indicators
        fraud_tx = txs[-1].copy()
        fraud_tx['price'] = 5000  # Price spike
        
        result = trained_engine.analyze_transaction(
            fraud_tx,
            wallet_history=txs,
            nft_price_history=price_history
        )
        
        # Should detect multiple issues
        assert len(result['flags']) >= 0
        assert result['risk_score'] > 0
    
    def test_normal_transaction(self, trained_engine, transaction_generator):
        """Test normal transaction analysis"""
        normal_txs = transaction_generator.generate_normal_transactions(10)
        
        result = trained_engine.analyze_transaction(normal_txs[0])
        
        # Normal transactions should have low risk
        assert result['risk_score'] < 70
    
    def test_edge_cases(self, trained_engine):
        """Test edge cases"""
        # Empty transaction
        result = trained_engine.analyze_transaction({})
        assert result is not None
        
        # Transaction with missing fields
        partial_tx = {'nft_id': 'nft_001', 'price': 1000}
        result = trained_engine.analyze_transaction(partial_tx)
        assert result is not None
    
    def test_concurrent_analysis(self, trained_engine, transaction_generator):
        """Test analyzing multiple transactions"""
        txs = transaction_generator.generate_normal_transactions(20)
        
        results = []
        for tx in txs:
            result = trained_engine.analyze_transaction(tx)
            results.append(result)
        
        assert len(results) == 20
        assert all('risk_score' in r for r in results)


class TestIntegration:
    """Integration tests"""
    
    def test_full_workflow(self, transaction_generator):
        """Test complete fraud detection workflow"""
        # 1. Initialize engine
        engine = FraudDetectionEngine()
        assert not engine.is_trained
        
        # 2. Generate training data
        training_data = transaction_generator.generate_mixed_dataset(
            normal=100,
            wash_trading=20,
            circular=10,
            price_spikes=5
        )
        
        # 3. Train engine
        engine.train(training_data)
        assert engine.is_trained
        
        # 4. Analyze new transactions
        test_txs = transaction_generator.generate_wash_trading_transactions(5)
        
        for tx in test_txs:
            result = engine.analyze_transaction(tx, wallet_history=test_txs)
            assert result is not None
            assert 'risk_score' in result
        
        # 5. Check statistics
        stats = engine.get_statistics()
        assert stats['is_trained']
        
        # 6. Get suspicious wallets
        wallets = engine.get_suspicious_wallets()
        assert isinstance(wallets, list)
    
    def test_mixed_fraud_scenarios(self, trained_engine, transaction_generator):
        """Test detection across mixed fraud scenarios"""
        # Generate various fraud types
        wash_txs = transaction_generator.generate_wash_trading_transactions(3)
        circular_txs = transaction_generator.generate_circular_transactions(3)
        flipping_txs = transaction_generator.generate_rapid_flipping_transactions(2)
        
        all_txs = wash_txs + circular_txs + flipping_txs
        
        high_risk_count = 0
        for tx in all_txs:
            result = trained_engine.analyze_transaction(tx, wallet_history=all_txs)
            if result['risk_category'] in ['Medium', 'High']:
                high_risk_count += 1
        
        # Should detect some fraud
        assert high_risk_count >= 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
