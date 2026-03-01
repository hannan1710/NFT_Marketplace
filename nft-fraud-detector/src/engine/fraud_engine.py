"""
Main fraud detection engine
Combines anomaly detection, pattern detection, and graph analysis
"""

import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime
import logging

from src.detectors.anomaly_detector import AnomalyDetector
from src.detectors.pattern_detector import PatternDetector
from src.graph.wallet_graph import WalletGraph

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FraudDetectionEngine:
    """
    Comprehensive fraud detection engine for NFT transactions
    """
    
    def __init__(self):
        """Initialize fraud detection engine"""
        self.anomaly_detector = AnomalyDetector(contamination=0.1)
        self.pattern_detector = PatternDetector()
        self.wallet_graph = WalletGraph()
        self.is_trained = False
        self.suspicious_wallets = set()
        self.fraud_log = []
    
    def train(self, historical_transactions: List[Dict]):
        """
        Train the fraud detection engine
        
        Args:
            historical_transactions: List of historical transactions
        """
        logger.info(f"Training fraud detection engine on {len(historical_transactions)} transactions")
        
        # Train anomaly detector
        import pandas as pd
        df = pd.DataFrame(historical_transactions)
        self.anomaly_detector.fit(df)
        
        # Build wallet graph
        self.wallet_graph.build_graph(historical_transactions)
        
        self.is_trained = True
        logger.info("Fraud detection engine trained successfully")
    
    def analyze_transaction(
        self,
        transaction: Dict,
        wallet_history: List[Dict] = None,
        nft_price_history: List[float] = None
    ) -> Dict:
        """
        Analyze a transaction for fraud
        
        Args:
            transaction: Transaction to analyze
            wallet_history: Historical transactions for the wallet
            nft_price_history: Historical prices for the NFT
            
        Returns:
            Comprehensive fraud analysis report
        """
        if not self.is_trained:
            logger.warning("Engine not trained, using default analysis")
        
        wallet_address = transaction.get('buyer') or transaction.get('seller')
        
        # Initialize results
        results = {
            'transaction_id': transaction.get('transaction_id'),
            'wallet_address': wallet_address,
            'timestamp': datetime.now().isoformat(),
            'fraud_detected': False,
            'risk_score': 0.0,
            'risk_category': 'Low',
            'anomaly_detection': {},
            'pattern_detection': {},
            'graph_analysis': {},
            'flags': []
        }
        
        # 1. Anomaly Detection
        if self.is_trained:
            try:
                anomaly_score, is_anomaly = self.anomaly_detector.predict_anomaly_score(transaction)
                results['anomaly_detection'] = {
                    'is_anomaly': bool(is_anomaly),  # Convert numpy.bool_ to Python bool
                    'anomaly_score': float(anomaly_score),  # Convert to Python float
                    'confidence': float(1.0 - anomaly_score)  # Lower score = higher confidence of anomaly
                }
                if is_anomaly:
                    results['flags'].append('ANOMALY_DETECTED')
            except Exception as e:
                logger.error(f"Anomaly detection error: {e}")
                results['anomaly_detection'] = {'error': str(e)}
        
        # 2. Pattern Detection
        if wallet_history:
            # Wash trading
            is_wash, wash_conf, wash_details = self.pattern_detector.detect_wash_trading(
                wallet_address, wallet_history
            )
            results['pattern_detection']['wash_trading'] = {
                'detected': is_wash,
                'confidence': wash_conf,
                'details': wash_details
            }
            if is_wash:
                results['flags'].append('WASH_TRADING')
            
            # Circular transfers
            is_circular, circ_conf, circ_details = self.pattern_detector.detect_circular_transfers(
                wallet_address, wallet_history
            )
            results['pattern_detection']['circular_transfers'] = {
                'detected': is_circular,
                'confidence': circ_conf,
                'details': circ_details
            }
            if is_circular:
                results['flags'].append('CIRCULAR_TRANSFERS')
            
            # Rapid flipping
            is_flipping, flip_conf, flip_details = self.pattern_detector.detect_rapid_flipping(
                wallet_address, wallet_history
            )
            results['pattern_detection']['rapid_flipping'] = {
                'detected': is_flipping,
                'confidence': flip_conf,
                'details': flip_details
            }
            if is_flipping:
                results['flags'].append('RAPID_FLIPPING')
        
        # Price spike detection
        if nft_price_history:
            is_spike, spike_conf, spike_details = self.pattern_detector.detect_price_spike(
                transaction, nft_price_history
            )
            results['pattern_detection']['price_spike'] = {
                'detected': is_spike,
                'confidence': spike_conf,
                'details': spike_details
            }
            if is_spike:
                results['flags'].append('PRICE_SPIKE')
        
        # 3. Graph Analysis
        if wallet_address:
            graph_metrics = self.wallet_graph.analyze_wallet(wallet_address)
            results['graph_analysis']['metrics'] = graph_metrics
            
            # Circular patterns
            cycles = self.wallet_graph.detect_circular_patterns(wallet_address)
            results['graph_analysis']['circular_patterns'] = {
                'detected': len(cycles) > 0,
                'count': len(cycles),
                'patterns': cycles[:5]  # Limit to 5 patterns
            }
            if cycles:
                results['flags'].append('GRAPH_CIRCULAR_PATTERN')
            
            # Sybil cluster detection
            sybil_info = self.wallet_graph.detect_sybil_cluster(wallet_address)
            results['graph_analysis']['sybil_cluster'] = sybil_info
            if sybil_info['is_sybil_cluster']:
                results['flags'].append('SYBIL_CLUSTER')
            
            # Calculate graph-based risk
            graph_risk = self.wallet_graph.calculate_risk_from_graph(wallet_address)
            results['graph_analysis']['graph_risk_score'] = graph_risk
        
        # 4. Calculate Overall Risk Score
        risk_score = self._calculate_risk_score(results)
        results['risk_score'] = risk_score
        results['risk_category'] = self._categorize_risk(risk_score)
        results['fraud_detected'] = risk_score >= 50.0
        
        # 5. Log suspicious wallets
        if results['fraud_detected']:
            self._log_suspicious_wallet(wallet_address, results)
        
        return results
    
    def _calculate_risk_score(self, results: Dict) -> float:
        """
        Calculate overall risk score (0-100)
        
        Args:
            results: Analysis results
            
        Returns:
            Risk score (0-100)
        """
        risk_score = 0.0
        
        # Anomaly detection (0-30 points)
        if results['anomaly_detection'].get('is_anomaly'):
            anomaly_conf = results['anomaly_detection'].get('confidence', 0)
            risk_score += anomaly_conf * 30
        
        # Pattern detection (0-40 points)
        pattern_det = results.get('pattern_detection', {})
        
        if pattern_det.get('wash_trading', {}).get('detected'):
            risk_score += pattern_det['wash_trading']['confidence'] * 15
        
        if pattern_det.get('circular_transfers', {}).get('detected'):
            risk_score += pattern_det['circular_transfers']['confidence'] * 15
        
        if pattern_det.get('price_spike', {}).get('detected'):
            risk_score += pattern_det['price_spike']['confidence'] * 10
        
        if pattern_det.get('rapid_flipping', {}).get('detected'):
            risk_score += pattern_det['rapid_flipping']['confidence'] * 10
        
        # Graph analysis (0-30 points)
        graph_analysis = results.get('graph_analysis', {})
        
        if graph_analysis.get('circular_patterns', {}).get('detected'):
            risk_score += 10
        
        if graph_analysis.get('sybil_cluster', {}).get('is_sybil_cluster'):
            risk_score += 10
        
        graph_risk = graph_analysis.get('graph_risk_score', 0)
        risk_score += graph_risk * 10
        
        return min(100.0, risk_score)
    
    def _categorize_risk(self, risk_score: float) -> str:
        """
        Categorize risk level
        
        Args:
            risk_score: Risk score (0-100)
            
        Returns:
            Risk category
        """
        if risk_score >= 70:
            return 'High'
        elif risk_score >= 40:
            return 'Medium'
        else:
            return 'Low'
    
    def _log_suspicious_wallet(self, wallet_address: str, results: Dict):
        """
        Log suspicious wallet
        
        Args:
            wallet_address: Wallet address
            results: Analysis results
        """
        self.suspicious_wallets.add(wallet_address)
        
        log_entry = {
            'wallet_address': wallet_address,
            'timestamp': datetime.now().isoformat(),
            'risk_score': results['risk_score'],
            'risk_category': results['risk_category'],
            'flags': results['flags']
        }
        
        self.fraud_log.append(log_entry)
        
        logger.warning(f"Suspicious wallet detected: {wallet_address} (Risk: {results['risk_score']:.1f})")
    
    def get_suspicious_wallets(self) -> List[str]:
        """
        Get list of suspicious wallets
        
        Returns:
            List of wallet addresses
        """
        return list(self.suspicious_wallets)
    
    def get_fraud_log(self, limit: int = 100) -> List[Dict]:
        """
        Get fraud detection log
        
        Args:
            limit: Maximum number of entries
            
        Returns:
            List of log entries
        """
        return self.fraud_log[-limit:]
    
    def get_statistics(self) -> Dict:
        """
        Get fraud detection statistics
        
        Returns:
            Statistics dictionary
        """
        return {
            'is_trained': self.is_trained,
            'suspicious_wallets_count': len(self.suspicious_wallets),
            'total_fraud_detections': len(self.fraud_log),
            'graph_statistics': self.wallet_graph.get_graph_statistics()
        }
