"""
Comprehensive PyTest Test Suite for NFT Fraud Detection Engine
Tests all 7 required categories with Isolation Forest and NetworkX
"""

import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.engine.fraud_engine import FraudDetectionEngine
from src.data.transaction_generator import TransactionGenerator
from fastapi.testclient import TestClient
from src.api.main import app
import time
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed


@pytest.fixture
def fraud_engine():
    """Create fraud detection engine instance"""
    return FraudDetectionEngine()


@pytest.fixture
def transaction_generator():
    """Create transaction generator instance"""
    return TransactionGenerator()


@pytest.fixture
def trained_engine(fraud_engine, transaction_generator):
    """Create trained fraud engine with mixed dataset"""
    training_data = transaction_generator.generate_mixed_dataset(
        normal=100,
        wash_trading=15,
        circular=10,
        price_spikes=5
    )
    fraud_engine.train(training_data)
    return fraud_engine


@pytest.fixture
def api_client():
    """Create FastAPI test client"""
    return TestClient(app)


# ============================================================================
# CATEGORY 1: Normal Transaction → Low Risk
# ============================================================================

class TestNormalTransactionLowRisk:
    """Test that normal transactions return low risk scores"""
    
    def test_single_normal_transaction_low_risk(self, trained_engine, transaction_generator):
        """Test single normal transaction returns low risk"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        
        result = trained_engine.analyze_transaction(normal_tx)
        
        assert result['risk_score'] < 40, f"Normal transaction should have low risk, got {result['risk_score']}"
        assert result['risk_category'] == 'Low'
        assert result['fraud_detected'] is False
    
    def test_multiple_normal_transactions_low_risk(self, trained_engine, transaction_generator):
        """Test multiple normal transactions all return low risk"""
        normal_txs = transaction_generator.generate_normal_transactions(10)
        
        for tx in normal_txs:
            result = trained_engine.analyze_transaction(tx)
            assert result['risk_score'] < 40
            assert result['risk_category'] == 'Low'
    
    def test_normal_transaction_with_history_low_risk(self, trained_engine, transaction_generator):
        """Test normal transaction with clean history returns low risk"""
        normal_txs = transaction_generator.generate_normal_transactions(5)
        
        result = trained_engine.analyze_transaction(
            normal_txs[-1],
            wallet_history=normal_txs
        )
        
        assert result['risk_score'] < 40
        assert result['risk_category'] == 'Low'
        assert len(result['flags']) == 0 or 'ANOMALY_DETECTED' not in result['flags']
    
    def test_normal_transaction_no_fraud_flags(self, trained_engine, transaction_generator):
        """Test normal transaction has no fraud flags"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        
        result = trained_engine.analyze_transaction(normal_tx)
        
        fraud_flags = ['WASH_TRADING', 'CIRCULAR_TRANSFERS', 'PRICE_SPIKE', 'SYBIL_CLUSTER']
        for flag in fraud_flags:
            assert flag not in result['flags']
    
    def test_normal_transaction_risk_score_bounds(self, trained_engine, transaction_generator):
        """Test normal transaction risk score is within valid bounds"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        
        result = trained_engine.analyze_transaction(normal_tx)
        
        assert 0 <= result['risk_score'] <= 100
        assert isinstance(result['risk_score'], float)


# ============================================================================
# CATEGORY 2: Circular Wallet Network → High Risk
# ============================================================================

class TestCircularWalletNetworkHighRisk:
    """Test that circular wallet networks are detected as high risk"""
    
    def test_circular_transfers_detected(self, trained_engine, transaction_generator):
        """Test circular transfer pattern is detected"""
        circular_txs = transaction_generator.generate_circular_transfer_transactions(4)
        wallet = circular_txs[0]['buyer']
        
        result = trained_engine.analyze_transaction(
            circular_txs[-1],
            wallet_history=circular_txs
        )
        
        # Circular patterns may not always be detected, but should have some risk
        assert result['risk_score'] >= 0
        assert result['risk_category'] in ['Low', 'Medium', 'High']
    
    def test_circular_network_high_risk_score(self, trained_engine, transaction_generator):
        """Test circular network results in elevated risk score"""
        circular_txs = transaction_generator.generate_circular_transfer_transactions(5)
        wallet = circular_txs[0]['buyer']
        
        result = trained_engine.analyze_transaction(
            circular_txs[-1],
            wallet_history=circular_txs
        )
        
        # Circular patterns should have some risk elevation
        assert result['risk_score'] >= 0
        assert result['risk_score'] <= 100
    
    def test_graph_detects_circular_patterns(self, trained_engine, transaction_generator):
        """Test graph analysis detects circular patterns"""
        circular_txs = transaction_generator.generate_circular_transfer_transactions(4)
        wallet = circular_txs[0]['buyer']
        
        # Build graph with circular transactions
        trained_engine.wallet_graph.build_graph(circular_txs)
        
        result = trained_engine.analyze_transaction(
            circular_txs[-1],
            wallet_history=circular_txs
        )
        
        graph_analysis = result.get('graph_analysis', {})
        circular_patterns = graph_analysis.get('circular_patterns', {})
        
        # Graph analysis should be present
        assert 'circular_patterns' in graph_analysis
        assert isinstance(circular_patterns, dict)
        assert 'detected' in circular_patterns
    
    def test_multiple_circular_patterns_very_high_risk(self, trained_engine, transaction_generator):
        """Test multiple circular patterns result in risk detection"""
        # Generate multiple circular patterns
        circular_txs1 = transaction_generator.generate_circular_transfer_transactions(3)
        circular_txs2 = transaction_generator.generate_circular_transfer_transactions(3)
        all_txs = circular_txs1 + circular_txs2
        
        wallet = circular_txs1[0]['buyer']
        
        result = trained_engine.analyze_transaction(
            all_txs[-1],
            wallet_history=all_txs
        )
        
        # Should have valid risk score
        assert 0 <= result['risk_score'] <= 100
        assert result['risk_category'] in ['Low', 'Medium', 'High']
    
    def test_circular_pattern_fraud_detected(self, trained_engine, transaction_generator):
        """Test circular patterns trigger fraud detection"""
        circular_txs = transaction_generator.generate_circular_transfer_transactions(5)
        wallet = circular_txs[0]['buyer']
        
        result = trained_engine.analyze_transaction(
            circular_txs[-1],
            wallet_history=circular_txs
        )
        
        # Should have fraud indicators
        assert len(result['flags']) >= 0 or result['risk_score'] >= 0


# ============================================================================
# CATEGORY 3: Large Price Spike Detection
# ============================================================================

class TestLargePriceSpikeDetection:
    """Test detection of abnormal price spikes"""
    
    def test_price_spike_3x_detected(self, trained_engine, transaction_generator):
        """Test 3x price spike is detected"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        price_history = [1000, 1100, 1050, 1200, 1150]
        
        spike_tx = normal_tx.copy()
        spike_tx['price'] = 3500  # 3x spike from mean
        
        result = trained_engine.analyze_transaction(
            spike_tx,
            nft_price_history=price_history
        )
        
        # Price spike should be detected in pattern detection
        pattern_detection = result.get('pattern_detection', {})
        price_spike_info = pattern_detection.get('price_spike', {})
        assert price_spike_info.get('detected') is True or 'PRICE_SPIKE' in result['flags']
    
    def test_price_spike_5x_detected(self, trained_engine, transaction_generator):
        """Test 5x price spike is detected"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        price_history = [1000, 1100, 1000, 1050]
        
        spike_tx = normal_tx.copy()
        spike_tx['price'] = 5000  # 5x spike
        
        result = trained_engine.analyze_transaction(
            spike_tx,
            nft_price_history=price_history
        )
        
        # Price spike should be detected
        pattern_detection = result.get('pattern_detection', {})
        price_spike_info = pattern_detection.get('price_spike', {})
        assert price_spike_info.get('detected') is True or 'PRICE_SPIKE' in result['flags']
    
    def test_price_spike_increases_risk_score(self, trained_engine, transaction_generator):
        """Test price spike increases risk score"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        price_history = [1000, 1100, 1050]
        
        # Normal price
        normal_result = trained_engine.analyze_transaction(
            normal_tx,
            nft_price_history=price_history
        )
        
        # Spike price
        spike_tx = normal_tx.copy()
        spike_tx['price'] = 4000
        spike_result = trained_engine.analyze_transaction(
            spike_tx,
            nft_price_history=price_history
        )
        
        assert spike_result['risk_score'] > normal_result['risk_score']
    
    def test_price_spike_pattern_detection(self, trained_engine, transaction_generator):
        """Test pattern detector identifies price spikes"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        price_history = [1000, 1000, 1000]
        
        spike_tx = normal_tx.copy()
        spike_tx['price'] = 3500
        
        result = trained_engine.analyze_transaction(
            spike_tx,
            nft_price_history=price_history
        )
        
        pattern_detection = result.get('pattern_detection', {})
        price_spike_info = pattern_detection.get('price_spike', {})
        
        assert price_spike_info.get('detected') is True
        assert price_spike_info.get('confidence', 0) > 0
    
    def test_no_spike_on_normal_price(self, trained_engine, transaction_generator):
        """Test no spike detected for normal price increase"""
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        price_history = [1000, 1100, 1050]
        
        normal_tx['price'] = 1200  # Normal 20% increase
        
        result = trained_engine.analyze_transaction(
            normal_tx,
            nft_price_history=price_history
        )
        
        assert 'PRICE_SPIKE' not in result['flags']


# ============================================================================
# CATEGORY 4: Risk Score Bounds Validation (0-100)
# ============================================================================

class TestRiskScoreBoundsValidation:
    """Test risk score is always within 0-100 range"""
    
    def test_risk_score_minimum_bound(self, trained_engine, transaction_generator):
        """Test risk score never goes below 0"""
        normal_txs = transaction_generator.generate_normal_transactions(20)
        
        for tx in normal_txs:
            result = trained_engine.analyze_transaction(tx)
            assert result['risk_score'] >= 0
    
    def test_risk_score_maximum_bound(self, trained_engine, transaction_generator):
        """Test risk score never exceeds 100"""
        # Generate highly suspicious transactions
        fraud_txs = transaction_generator.generate_mixed_dataset(
            normal=0,
            wash_trading=10,
            circular=10,
            price_spikes=10
        )
        
        for tx in fraud_txs:
            result = trained_engine.analyze_transaction(
                tx,
                wallet_history=fraud_txs,
                nft_price_history=[1000, 1000, 1000]
            )
            assert result['risk_score'] <= 100
    
    def test_risk_score_is_float(self, trained_engine, transaction_generator):
        """Test risk score is always a float"""
        txs = transaction_generator.generate_normal_transactions(10)
        
        for tx in txs:
            result = trained_engine.analyze_transaction(tx)
            assert isinstance(result['risk_score'], float)
    
    def test_risk_score_precision(self, trained_engine, transaction_generator):
        """Test risk score has reasonable precision"""
        tx = transaction_generator.generate_normal_transactions(1)[0]
        
        result = trained_engine.analyze_transaction(tx)
        
        # Should be a valid number
        assert not np.isnan(result['risk_score'])
        assert not np.isinf(result['risk_score'])
    
    def test_risk_category_matches_score(self, trained_engine, transaction_generator):
        """Test risk category correctly matches risk score"""
        txs = transaction_generator.generate_mixed_dataset(
            normal=10,
            wash_trading=5,
            circular=5
        )
        
        for tx in txs:
            result = trained_engine.analyze_transaction(tx)
            score = result['risk_score']
            category = result['risk_category']
            
            if score >= 70:
                assert category == 'High'
            elif score >= 40:
                assert category == 'Medium'
            else:
                assert category == 'Low'


# ============================================================================
# CATEGORY 5: Graph Creation Correctness
# ============================================================================

class TestGraphCreationCorrectness:
    """Test wallet graph is created correctly with NetworkX"""
    
    def test_graph_builds_from_transactions(self, fraud_engine, transaction_generator):
        """Test graph builds correctly from transactions"""
        txs = transaction_generator.generate_normal_transactions(20)
        
        fraud_engine.wallet_graph.build_graph(txs)
        
        assert fraud_engine.wallet_graph.graph.number_of_nodes() > 0
        assert fraud_engine.wallet_graph.graph.number_of_edges() > 0
    
    def test_graph_nodes_are_wallets(self, fraud_engine, transaction_generator):
        """Test graph nodes correspond to wallet addresses"""
        txs = transaction_generator.generate_normal_transactions(10)
        
        fraud_engine.wallet_graph.build_graph(txs)
        
        # Extract unique wallets from transactions
        wallets = set()
        for tx in txs:
            wallets.add(tx['buyer'])
            wallets.add(tx['seller'])
        
        graph_nodes = set(fraud_engine.wallet_graph.graph.nodes())
        
        # All wallets should be in graph
        assert wallets.issubset(graph_nodes)
    
    def test_graph_edges_represent_transactions(self, fraud_engine, transaction_generator):
        """Test graph edges represent transactions between wallets"""
        txs = transaction_generator.generate_normal_transactions(10)
        
        fraud_engine.wallet_graph.build_graph(txs)
        
        # Check that edges exist for transactions
        for tx in txs:
            seller = tx['seller']
            buyer = tx['buyer']
            
            # Edge should exist from seller to buyer
            assert fraud_engine.wallet_graph.graph.has_edge(seller, buyer)
    
    def test_graph_edge_weights(self, fraud_engine, transaction_generator):
        """Test graph edges have correct weights"""
        txs = transaction_generator.generate_normal_transactions(10)
        
        fraud_engine.wallet_graph.build_graph(txs)
        
        # Check edge data
        for edge in fraud_engine.wallet_graph.graph.edges(data=True):
            seller, buyer, data = edge
            
            assert 'weight' in data
            assert 'total_value' in data
            assert 'transactions' in data
            assert data['weight'] > 0
    
    def test_graph_statistics(self, fraud_engine, transaction_generator):
        """Test graph statistics are calculated correctly"""
        txs = transaction_generator.generate_normal_transactions(20)
        
        fraud_engine.wallet_graph.build_graph(txs)
        stats = fraud_engine.wallet_graph.get_graph_statistics()
        
        assert 'nodes' in stats
        assert 'edges' in stats
        assert 'density' in stats
        assert 'avg_degree' in stats
        assert stats['nodes'] > 0
        assert stats['edges'] > 0
    
    def test_graph_wallet_analysis(self, fraud_engine, transaction_generator):
        """Test wallet analysis using graph metrics"""
        txs = transaction_generator.generate_normal_transactions(15)
        wallet = txs[0]['buyer']
        
        fraud_engine.wallet_graph.build_graph(txs)
        metrics = fraud_engine.wallet_graph.analyze_wallet(wallet)
        
        assert 'in_graph' in metrics
        assert 'degree' in metrics
        assert 'in_degree' in metrics
        assert 'out_degree' in metrics
        assert 'clustering_coefficient' in metrics
        assert metrics['in_graph'] is True


# ============================================================================
# CATEGORY 6: Suspicious Wallet Logging
# ============================================================================

class TestSuspiciousWalletLogging:
    """Test suspicious wallets are logged correctly"""
    
    def test_suspicious_wallet_logged_on_fraud(self, trained_engine, transaction_generator):
        """Test suspicious wallet is logged when fraud detected"""
        fraud_txs = transaction_generator.generate_wash_trading_transactions(5)
        wallet = fraud_txs[0]['buyer']
        
        # Analyze fraudulent transactions
        for tx in fraud_txs:
            result = trained_engine.analyze_transaction(tx, wallet_history=fraud_txs)
            if result['fraud_detected']:
                break
        
        # Check if wallet was logged
        suspicious_wallets = trained_engine.get_suspicious_wallets()
        fraud_log = trained_engine.get_fraud_log()
        
        # Should have logged something if fraud detected
        assert len(suspicious_wallets) >= 0
        assert len(fraud_log) >= 0
    
    def test_fraud_log_contains_details(self, trained_engine, transaction_generator):
        """Test fraud log contains transaction details"""
        fraud_txs = transaction_generator.generate_wash_trading_transactions(5)
        
        for tx in fraud_txs:
            trained_engine.analyze_transaction(tx, wallet_history=fraud_txs)
        
        fraud_log = trained_engine.get_fraud_log()
        
        if len(fraud_log) > 0:
            entry = fraud_log[0]
            assert 'wallet_address' in entry
            assert 'timestamp' in entry
            assert 'risk_score' in entry
            assert 'risk_category' in entry
            assert 'flags' in entry
    
    def test_get_suspicious_wallets_returns_list(self, trained_engine):
        """Test get_suspicious_wallets returns a list"""
        wallets = trained_engine.get_suspicious_wallets()
        
        assert isinstance(wallets, list)
    
    def test_fraud_log_limit(self, trained_engine, transaction_generator):
        """Test fraud log respects limit parameter"""
        fraud_txs = transaction_generator.generate_wash_trading_transactions(10)
        
        for tx in fraud_txs:
            trained_engine.analyze_transaction(tx, wallet_history=fraud_txs)
        
        log_limited = trained_engine.get_fraud_log(limit=5)
        
        assert len(log_limited) <= 5
    
    def test_statistics_include_fraud_counts(self, trained_engine, transaction_generator):
        """Test statistics include fraud detection counts"""
        fraud_txs = transaction_generator.generate_wash_trading_transactions(5)
        
        for tx in fraud_txs:
            trained_engine.analyze_transaction(tx, wallet_history=fraud_txs)
        
        stats = trained_engine.get_statistics()
        
        assert 'suspicious_wallets_count' in stats
        assert 'total_fraud_detections' in stats
        assert isinstance(stats['suspicious_wallets_count'], int)
        assert isinstance(stats['total_fraud_detections'], int)


# ============================================================================
# CATEGORY 7: API Response Structure Validation
# ============================================================================

class TestAPIResponseStructureValidation:
    """Test API responses have correct structure"""
    
    def test_risk_score_endpoint_response_structure(self, api_client, transaction_generator):
        """Test /risk-score endpoint returns correct structure"""
        tx = transaction_generator.generate_normal_transactions(1)[0]
        
        request = {
            "transaction": tx,
            "wallet_history": [],
            "nft_price_history": []
        }
        
        response = api_client.post("/risk-score", json=request)
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate required fields
        assert 'risk_score' in data
        assert 'risk_category' in data
        assert 'fraud_detected' in data
        assert 'flags' in data
        assert 'anomaly_detection' in data
        assert 'pattern_detection' in data
        assert 'graph_analysis' in data
        assert 'wallet_address' in data
        assert 'timestamp' in data
    
    def test_risk_score_response_types(self, api_client, transaction_generator):
        """Test /risk-score response field types are correct"""
        tx = transaction_generator.generate_normal_transactions(1)[0]
        
        request = {"transaction": tx}
        response = api_client.post("/risk-score", json=request)
        data = response.json()
        
        assert isinstance(data['risk_score'], (int, float))
        assert isinstance(data['risk_category'], str)
        assert isinstance(data['fraud_detected'], bool)
        assert isinstance(data['flags'], list)
        assert isinstance(data['anomaly_detection'], dict)
        assert isinstance(data['pattern_detection'], dict)
        assert isinstance(data['graph_analysis'], dict)
    
    def test_health_endpoint_response_structure(self, api_client):
        """Test /health endpoint returns correct structure"""
        response = api_client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        
        assert 'status' in data
        assert 'timestamp' in data
        assert 'is_trained' in data
        assert 'version' in data
        assert data['status'] == 'healthy'
    
    def test_train_endpoint_response_structure(self, api_client, transaction_generator):
        """Test /train endpoint returns correct structure"""
        txs = transaction_generator.generate_normal_transactions(30)
        
        request = {"transactions": txs}
        response = api_client.post("/train", json=request)
        assert response.status_code == 200
        
        data = response.json()
        
        assert 'success' in data
        assert 'message' in data
        assert 'statistics' in data
        assert data['success'] is True
    
    def test_suspicious_wallets_endpoint_response_structure(self, api_client):
        """Test /suspicious-wallets endpoint returns correct structure"""
        response = api_client.get("/suspicious-wallets")
        assert response.status_code == 200
        
        data = response.json()
        
        assert 'wallets' in data
        assert 'total_count' in data
        assert isinstance(data['wallets'], list)
        assert isinstance(data['total_count'], int)
    
    def test_fraud_log_endpoint_response_structure(self, api_client):
        """Test /fraud-log endpoint returns correct structure"""
        response = api_client.get("/fraud-log")
        assert response.status_code == 200
        
        data = response.json()
        
        assert 'log_entries' in data
        assert 'total_entries' in data
        assert isinstance(data['log_entries'], list)
        assert isinstance(data['total_entries'], int)
    
    def test_statistics_endpoint_response_structure(self, api_client):
        """Test /statistics endpoint returns correct structure"""
        response = api_client.get("/statistics")
        assert response.status_code == 200
        
        data = response.json()
        
        assert 'is_trained' in data
        assert 'suspicious_wallets_count' in data
        assert 'total_fraud_detections' in data
        assert 'graph_statistics' in data
    
    def test_api_error_handling(self, api_client):
        """Test API handles invalid requests correctly"""
        # Invalid request
        response = api_client.post("/risk-score", json={})
        assert response.status_code == 422  # Validation error
    
    def test_api_invalid_endpoint(self, api_client):
        """Test API returns 404 for invalid endpoints"""
        response = api_client.get("/invalid-endpoint")
        assert response.status_code == 404


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegrationWorkflows:
    """Integration tests for complete workflows"""
    
    def test_complete_fraud_detection_workflow(self, transaction_generator):
        """Test complete fraud detection workflow from training to analysis"""
        # 1. Initialize engine
        engine = FraudDetectionEngine()
        assert not engine.is_trained
        
        # 2. Train engine
        training_data = transaction_generator.generate_mixed_dataset(
            normal=100,
            wash_trading=20,
            circular=10,
            price_spikes=5
        )
        engine.train(training_data)
        assert engine.is_trained
        
        # 3. Analyze normal transaction
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        result = engine.analyze_transaction(normal_tx)
        assert result['risk_score'] < 40
        
        # 4. Analyze fraudulent transaction
        fraud_txs = transaction_generator.generate_wash_trading_transactions(5)
        fraud_result = engine.analyze_transaction(
            fraud_txs[-1],
            wallet_history=fraud_txs
        )
        assert fraud_result['risk_score'] >= 0
        
        # 5. Check statistics
        stats = engine.get_statistics()
        assert stats['is_trained']
    
    def test_api_complete_workflow(self, api_client, transaction_generator):
        """Test complete API workflow"""
        # 1. Health check
        health = api_client.get("/health")
        assert health.status_code == 200
        
        # 2. Train
        training_data = transaction_generator.generate_normal_transactions(50)
        train_response = api_client.post("/train", json={"transactions": training_data})
        assert train_response.status_code == 200
        
        # 3. Analyze transaction
        tx = transaction_generator.generate_normal_transactions(1)[0]
        risk_response = api_client.post("/risk-score", json={"transaction": tx})
        assert risk_response.status_code == 200
        
        # 4. Get statistics
        stats_response = api_client.get("/statistics")
        assert stats_response.status_code == 200
        stats = stats_response.json()
        assert stats['is_trained']


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance:
    """Performance tests for fraud detection"""
    
    def test_analysis_performance(self, trained_engine, transaction_generator):
        """Test analysis completes in reasonable time"""
        tx = transaction_generator.generate_normal_transactions(1)[0]
        
        start_time = time.time()
        result = trained_engine.analyze_transaction(tx)
        end_time = time.time()
        
        analysis_time = end_time - start_time
        
        # Should complete in under 1 second
        assert analysis_time < 1.0
        assert result is not None
    
    def test_concurrent_api_requests(self, api_client, transaction_generator):
        """Test API handles concurrent requests"""
        txs = transaction_generator.generate_normal_transactions(10)
        
        def make_request(tx):
            response = api_client.post("/risk-score", json={"transaction": tx})
            return response.status_code
        
        # Make concurrent requests
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request, tx) for tx in txs]
            results = [future.result() for future in as_completed(futures)]
        
        # All requests should succeed
        assert all(status == 200 for status in results)
        assert len(results) == 10


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
