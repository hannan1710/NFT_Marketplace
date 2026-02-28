"""
Pattern-based fraud detection
Detects wash trading, circular transfers, and price spikes
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Set, Tuple
from collections import defaultdict, Counter
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PatternDetector:
    """
    Detect fraudulent patterns in NFT transactions
    """
    
    def __init__(self):
        """Initialize pattern detector"""
        self.wash_trading_threshold = 3  # Min transactions for wash trading
        self.price_spike_threshold = 3.0  # 3x price increase
        self.circular_transfer_max_hops = 5
    
    def detect_wash_trading(
        self,
        wallet_address: str,
        transaction_history: List[Dict]
    ) -> Tuple[bool, float, Dict]:
        """
        Detect wash trading patterns
        Wash trading: Same wallet buying and selling same NFT repeatedly
        
        Args:
            wallet_address: Wallet to analyze
            transaction_history: List of transactions
            
        Returns:
            Tuple of (is_wash_trading, confidence, details)
        """
        if not transaction_history:
            return False, 0.0, {}
        
        # Group transactions by NFT
        nft_transactions = defaultdict(list)
        for tx in transaction_history:
            nft_id = tx.get('nft_id')
            if nft_id:
                nft_transactions[nft_id].append(tx)
        
        wash_trading_nfts = []
        total_wash_trades = 0
        
        for nft_id, txs in nft_transactions.items():
            # Count buy and sell transactions
            buys = sum(1 for tx in txs if tx.get('buyer') == wallet_address)
            sells = sum(1 for tx in txs if tx.get('seller') == wallet_address)
            
            # Wash trading if wallet both buys and sells same NFT multiple times
            if buys >= 2 and sells >= 2:
                wash_trading_nfts.append({
                    'nft_id': nft_id,
                    'buy_count': buys,
                    'sell_count': sells,
                    'total_transactions': len(txs)
                })
                total_wash_trades += min(buys, sells)
        
        is_wash_trading = len(wash_trading_nfts) > 0
        
        # Calculate confidence based on frequency
        if is_wash_trading:
            confidence = min(1.0, total_wash_trades / 10.0)  # Max at 10 trades
        else:
            confidence = 0.0
        
        details = {
            'wash_trading_nfts': wash_trading_nfts,
            'total_wash_trades': total_wash_trades,
            'affected_nfts': len(wash_trading_nfts)
        }
        
        return is_wash_trading, confidence, details
    
    def detect_circular_transfers(
        self,
        wallet_address: str,
        transaction_history: List[Dict],
        max_hops: int = None
    ) -> Tuple[bool, float, Dict]:
        """
        Detect circular transfer patterns
        Circular: NFT transferred through multiple wallets and back to origin
        
        Args:
            wallet_address: Starting wallet
            transaction_history: List of transactions
            max_hops: Maximum hops to check
            
        Returns:
            Tuple of (is_circular, confidence, details)
        """
        if max_hops is None:
            max_hops = self.circular_transfer_max_hops
        
        if not transaction_history:
            return False, 0.0, {}
        
        # Build transfer chains for each NFT
        nft_chains = defaultdict(list)
        for tx in transaction_history:
            nft_id = tx.get('nft_id')
            if nft_id:
                nft_chains[nft_id].append({
                    'from': tx.get('seller'),
                    'to': tx.get('buyer'),
                    'timestamp': tx.get('timestamp'),
                    'price': tx.get('price', 0)
                })
        
        circular_patterns = []
        
        for nft_id, chain in nft_chains.items():
            # Sort by timestamp
            chain.sort(key=lambda x: x.get('timestamp', 0))
            
            # Check if NFT returns to original wallet
            for i, tx in enumerate(chain):
                if tx['from'] == wallet_address:
                    # Check subsequent transfers
                    path = [wallet_address]
                    current_holder = tx['to']
                    path.append(current_holder)
                    
                    for j in range(i + 1, min(i + max_hops, len(chain))):
                        next_tx = chain[j]
                        if next_tx['from'] == current_holder:
                            current_holder = next_tx['to']
                            path.append(current_holder)
                            
                            # Check if returned to origin
                            if current_holder == wallet_address:
                                circular_patterns.append({
                                    'nft_id': nft_id,
                                    'path': path,
                                    'hops': len(path) - 1,
                                    'start_index': i,
                                    'end_index': j
                                })
                                break
        
        is_circular = len(circular_patterns) > 0
        
        # Calculate confidence based on number of circular patterns
        if is_circular:
            confidence = min(1.0, len(circular_patterns) / 3.0)
        else:
            confidence = 0.0
        
        details = {
            'circular_patterns': circular_patterns,
            'total_circular_transfers': len(circular_patterns)
        }
        
        return is_circular, confidence, details
    
    def detect_price_spike(
        self,
        transaction: Dict,
        historical_prices: List[float]
    ) -> Tuple[bool, float, Dict]:
        """
        Detect abnormal price spikes
        
        Args:
            transaction: Current transaction
            historical_prices: Historical prices for this NFT
            
        Returns:
            Tuple of (is_spike, confidence, details)
        """
        current_price = transaction.get('price', 0)
        
        if not historical_prices or current_price == 0:
            return False, 0.0, {}
        
        # Calculate statistics
        historical_prices = [p for p in historical_prices if p > 0]
        if not historical_prices:
            return False, 0.0, {}
        
        mean_price = np.mean(historical_prices)
        median_price = np.median(historical_prices)
        std_price = np.std(historical_prices)
        max_price = np.max(historical_prices)
        
        # Check for spike
        is_spike = False
        spike_ratio = 0.0
        spike_type = None
        
        # Spike relative to mean
        if mean_price > 0:
            spike_ratio = current_price / mean_price
            if spike_ratio >= self.price_spike_threshold:
                is_spike = True
                spike_type = 'mean'
        
        # Spike relative to median
        if median_price > 0:
            median_ratio = current_price / median_price
            if median_ratio >= self.price_spike_threshold:
                is_spike = True
                if spike_type is None:
                    spike_type = 'median'
        
        # Spike relative to max historical
        if max_price > 0:
            max_ratio = current_price / max_price
            if max_ratio >= 2.0:  # 2x previous max
                is_spike = True
                if spike_type is None:
                    spike_type = 'historical_max'
        
        # Calculate confidence based on spike magnitude
        if is_spike:
            confidence = min(1.0, (spike_ratio - 1.0) / 10.0)
        else:
            confidence = 0.0
        
        details = {
            'current_price': current_price,
            'mean_price': mean_price,
            'median_price': median_price,
            'max_historical_price': max_price,
            'spike_ratio': spike_ratio,
            'spike_type': spike_type,
            'std_deviation': std_price
        }
        
        return is_spike, confidence, details
    
    def detect_rapid_flipping(
        self,
        wallet_address: str,
        transaction_history: List[Dict],
        time_window_hours: int = 24
    ) -> Tuple[bool, float, Dict]:
        """
        Detect rapid buy-sell flipping
        
        Args:
            wallet_address: Wallet to analyze
            transaction_history: List of transactions
            time_window_hours: Time window to check
            
        Returns:
            Tuple of (is_flipping, confidence, details)
        """
        if not transaction_history:
            return False, 0.0, {}
        
        # Sort by timestamp
        sorted_txs = sorted(
            transaction_history,
            key=lambda x: x.get('timestamp', 0)
        )
        
        flips = []
        time_window_seconds = time_window_hours * 3600
        
        for i, buy_tx in enumerate(sorted_txs):
            if buy_tx.get('buyer') != wallet_address:
                continue
            
            nft_id = buy_tx.get('nft_id')
            buy_time = buy_tx.get('timestamp', 0)
            buy_price = buy_tx.get('price', 0)
            
            # Look for subsequent sell
            for sell_tx in sorted_txs[i+1:]:
                if sell_tx.get('nft_id') != nft_id:
                    continue
                if sell_tx.get('seller') != wallet_address:
                    continue
                
                sell_time = sell_tx.get('timestamp', 0)
                sell_price = sell_tx.get('price', 0)
                time_diff = sell_time - buy_time
                
                if time_diff <= time_window_seconds:
                    profit_pct = ((sell_price - buy_price) / buy_price * 100) if buy_price > 0 else 0
                    
                    flips.append({
                        'nft_id': nft_id,
                        'buy_price': buy_price,
                        'sell_price': sell_price,
                        'profit_pct': profit_pct,
                        'time_diff_hours': time_diff / 3600
                    })
                    break
        
        is_flipping = len(flips) >= 2
        
        # Calculate confidence
        if is_flipping:
            confidence = min(1.0, len(flips) / 5.0)
        else:
            confidence = 0.0
        
        details = {
            'flips': flips,
            'total_flips': len(flips),
            'time_window_hours': time_window_hours
        }
        
        return is_flipping, confidence, details
