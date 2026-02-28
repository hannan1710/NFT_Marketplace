"""
Hybrid scoring system combining multiple detection methods
"""

from typing import Dict, List, Tuple
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HybridScorer:
    """
    Advanced hybrid scoring system that combines multiple detection methods
    with configurable weights and thresholds
    """
    
    def __init__(
        self,
        anomaly_weight: float = 0.3,
        pattern_weight: float = 0.4,
        graph_weight: float = 0.3,
        high_risk_threshold: float = 70.0,
        medium_risk_threshold: float = 40.0
    ):
        """
        Initialize hybrid scorer
        
        Args:
            anomaly_weight: Weight for anomaly detection (0-1)
            pattern_weight: Weight for pattern detection (0-1)
            graph_weight: Weight for graph analysis (0-1)
            high_risk_threshold: Threshold for high risk (0-100)
            medium_risk_threshold: Threshold for medium risk (0-100)
        """
        # Validate weights sum to 1.0
        total_weight = anomaly_weight + pattern_weight + graph_weight
        if not np.isclose(total_weight, 1.0):
            logger.warning(f"Weights sum to {total_weight}, normalizing...")
            anomaly_weight /= total_weight
            pattern_weight /= total_weight
            graph_weight /= total_weight
        
        self.anomaly_weight = anomaly_weight
        self.pattern_weight = pattern_weight
        self.graph_weight = graph_weight
        self.high_risk_threshold = high_risk_threshold
        self.medium_risk_threshold = medium_risk_threshold
        
        logger.info(f"Hybrid scorer initialized with weights: "
                   f"anomaly={anomaly_weight:.2f}, "
                   f"pattern={pattern_weight:.2f}, "
                   f"graph={graph_weight:.2f}")
    
    def calculate_weighted_score(self, results: Dict) -> Dict:
        """
        Calculate weighted risk score from detection results
        
        Args:
            results: Detection results from fraud engine
            
        Returns:
            Enhanced results with weighted scoring breakdown
        """
        # Extract component scores
        anomaly_score = self._extract_anomaly_score(results)
        pattern_score = self._extract_pattern_score(results)
        graph_score = self._extract_graph_score(results)
        
        # Calculate weighted total
        weighted_score = (
            anomaly_score * self.anomaly_weight +
            pattern_score * self.pattern_weight +
            graph_score * self.graph_weight
        )
        
        # Calculate confidence based on score variance
        confidence = self._calculate_confidence(
            anomaly_score, pattern_score, graph_score
        )
        
        # Determine risk level
        risk_level = self._determine_risk_level(weighted_score)
        
        # Create enhanced results
        enhanced_results = {
            'weighted_score': weighted_score,
            'confidence': confidence,
            'risk_level': risk_level,
            'component_scores': {
                'anomaly': {
                    'score': anomaly_score,
                    'weight': self.anomaly_weight,
                    'contribution': anomaly_score * self.anomaly_weight
                },
                'pattern': {
                    'score': pattern_score,
                    'weight': self.pattern_weight,
                    'contribution': pattern_score * self.pattern_weight
                },
                'graph': {
                    'score': graph_score,
                    'weight': self.graph_weight,
                    'contribution': graph_score * self.graph_weight
                }
            },
            'scoring_metadata': {
                'timestamp': datetime.now().isoformat(),
                'method': 'hybrid_weighted',
                'version': '1.0'
            }
        }
        
        return enhanced_results
    
    def _extract_anomaly_score(self, results: Dict) -> float:
        """Extract normalized anomaly score (0-100)"""
        anomaly_data = results.get('anomaly_detection', {})
        
        if anomaly_data.get('is_anomaly'):
            confidence = anomaly_data.get('confidence', 0)
            return confidence * 100
        
        return 0.0
    
    def _extract_pattern_score(self, results: Dict) -> float:
        """Extract normalized pattern detection score (0-100)"""
        pattern_data = results.get('pattern_detection', {})
        score = 0.0
        
        # Wash trading (0-40 points)
        if pattern_data.get('wash_trading', {}).get('detected'):
            confidence = pattern_data['wash_trading'].get('confidence', 0)
            score += confidence * 40
        
        # Circular transfers (0-30 points)
        if pattern_data.get('circular_transfers', {}).get('detected'):
            confidence = pattern_data['circular_transfers'].get('confidence', 0)
            score += confidence * 30
        
        # Price spike (0-20 points)
        if pattern_data.get('price_spike', {}).get('detected'):
            confidence = pattern_data['price_spike'].get('confidence', 0)
            score += confidence * 20
        
        # Rapid flipping (0-10 points)
        if pattern_data.get('rapid_flipping', {}).get('detected'):
            confidence = pattern_data['rapid_flipping'].get('confidence', 0)
            score += confidence * 10
        
        return min(100.0, score)
    
    def _extract_graph_score(self, results: Dict) -> float:
        """Extract normalized graph analysis score (0-100)"""
        graph_data = results.get('graph_analysis', {})
        score = 0.0
        
        # Circular patterns (0-40 points)
        if graph_data.get('circular_patterns', {}).get('detected'):
            count = graph_data['circular_patterns'].get('count', 0)
            score += min(40.0, count * 8)  # 8 points per pattern, max 40
        
        # Sybil cluster (0-40 points)
        if graph_data.get('sybil_cluster', {}).get('is_sybil_cluster'):
            cluster_size = graph_data['sybil_cluster'].get('cluster_size', 1)
            score += min(40.0, (cluster_size - 1) * 10)  # 10 points per extra wallet
        
        # Graph risk score (0-20 points)
        graph_risk = graph_data.get('graph_risk_score', 0)
        score += graph_risk * 20
        
        return min(100.0, score)
    
    def _calculate_confidence(
        self,
        anomaly_score: float,
        pattern_score: float,
        graph_score: float
    ) -> float:
        """
        Calculate confidence based on score agreement
        
        High confidence when scores agree, low when they diverge
        
        Returns:
            Confidence score (0-1)
        """
        scores = [anomaly_score, pattern_score, graph_score]
        
        # Remove zero scores for variance calculation
        non_zero_scores = [s for s in scores if s > 0]
        
        if len(non_zero_scores) == 0:
            return 1.0  # High confidence in "no fraud"
        
        if len(non_zero_scores) == 1:
            return 0.6  # Medium confidence with single indicator
        
        # Calculate coefficient of variation (normalized std dev)
        mean_score = np.mean(non_zero_scores)
        std_score = np.std(non_zero_scores)
        
        if mean_score == 0:
            return 1.0
        
        cv = std_score / mean_score
        
        # Convert CV to confidence (lower CV = higher confidence)
        # CV of 0 = confidence 1.0, CV of 1+ = confidence 0.5
        confidence = max(0.5, 1.0 - (cv * 0.5))
        
        return confidence
    
    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level from score"""
        if score >= self.high_risk_threshold:
            return 'High'
        elif score >= self.medium_risk_threshold:
            return 'Medium'
        else:
            return 'Low'
    
    def adjust_weights(
        self,
        anomaly_weight: float = None,
        pattern_weight: float = None,
        graph_weight: float = None
    ):
        """
        Dynamically adjust scoring weights
        
        Args:
            anomaly_weight: New anomaly weight
            pattern_weight: New pattern weight
            graph_weight: New graph weight
        """
        if anomaly_weight is not None:
            self.anomaly_weight = anomaly_weight
        if pattern_weight is not None:
            self.pattern_weight = pattern_weight
        if graph_weight is not None:
            self.graph_weight = graph_weight
        
        # Normalize weights
        total = self.anomaly_weight + self.pattern_weight + self.graph_weight
        self.anomaly_weight /= total
        self.pattern_weight /= total
        self.graph_weight /= total
        
        logger.info(f"Weights adjusted: anomaly={self.anomaly_weight:.2f}, "
                   f"pattern={self.pattern_weight:.2f}, "
                   f"graph={self.graph_weight:.2f}")
    
    def get_recommendation(self, enhanced_results: Dict) -> Dict:
        """
        Get actionable recommendations based on results
        
        Args:
            enhanced_results: Results from calculate_weighted_score
            
        Returns:
            Recommendations dictionary
        """
        score = enhanced_results['weighted_score']
        confidence = enhanced_results['confidence']
        risk_level = enhanced_results['risk_level']
        
        recommendations = {
            'action': None,
            'priority': None,
            'details': [],
            'next_steps': []
        }
        
        # High risk recommendations
        if risk_level == 'High':
            if confidence > 0.8:
                recommendations['action'] = 'BLOCK'
                recommendations['priority'] = 'CRITICAL'
                recommendations['details'].append('High confidence fraud detection')
                recommendations['next_steps'].extend([
                    'Block transaction immediately',
                    'Flag wallet for investigation',
                    'Review transaction history',
                    'Consider account suspension'
                ])
            else:
                recommendations['action'] = 'REVIEW'
                recommendations['priority'] = 'HIGH'
                recommendations['details'].append('High risk but lower confidence')
                recommendations['next_steps'].extend([
                    'Manual review required',
                    'Request additional verification',
                    'Monitor wallet activity'
                ])
        
        # Medium risk recommendations
        elif risk_level == 'Medium':
            recommendations['action'] = 'MONITOR'
            recommendations['priority'] = 'MEDIUM'
            recommendations['details'].append('Suspicious patterns detected')
            recommendations['next_steps'].extend([
                'Enhanced monitoring',
                'Track for pattern escalation',
                'Consider additional verification'
            ])
        
        # Low risk recommendations
        else:
            recommendations['action'] = 'ALLOW'
            recommendations['priority'] = 'LOW'
            recommendations['details'].append('Normal transaction behavior')
            recommendations['next_steps'].append('Standard processing')
        
        # Add component-specific recommendations
        components = enhanced_results['component_scores']
        
        if components['anomaly']['contribution'] > 20:
            recommendations['details'].append('Anomalous transaction patterns detected')
        
        if components['pattern']['contribution'] > 25:
            recommendations['details'].append('Known fraud patterns identified')
        
        if components['graph']['contribution'] > 20:
            recommendations['details'].append('Suspicious wallet relationships')
        
        return recommendations


class AdaptiveScorer(HybridScorer):
    """
    Adaptive scorer that learns from feedback to adjust weights
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.feedback_history = []
        self.learning_rate = 0.1
    
    def add_feedback(
        self,
        transaction_id: str,
        predicted_score: float,
        actual_fraud: bool,
        fraud_type: str = None
    ):
        """
        Add feedback for adaptive learning
        
        Args:
            transaction_id: Transaction identifier
            predicted_score: Predicted risk score
            actual_fraud: Whether fraud actually occurred
            fraud_type: Type of fraud if applicable
        """
        feedback = {
            'transaction_id': transaction_id,
            'predicted_score': predicted_score,
            'actual_fraud': actual_fraud,
            'fraud_type': fraud_type,
            'timestamp': datetime.now().isoformat()
        }
        
        self.feedback_history.append(feedback)
        
        # Adjust weights based on feedback
        if len(self.feedback_history) >= 10:
            self._adjust_weights_from_feedback()
    
    def _adjust_weights_from_feedback(self):
        """Adjust weights based on recent feedback"""
        recent_feedback = self.feedback_history[-10:]
        
        # Calculate accuracy for each component
        # This is a simplified version - production would be more sophisticated
        
        # For now, just log that we're learning
        logger.info(f"Adaptive learning from {len(recent_feedback)} feedback samples")
        
        # In production, you would:
        # 1. Analyze which components predicted correctly
        # 2. Increase weights for accurate components
        # 3. Decrease weights for inaccurate components
        # 4. Use gradient descent or similar optimization
