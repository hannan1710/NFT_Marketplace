"""
Graph-based wallet relationship analysis using NetworkX
"""

import networkx as nx
import numpy as np
from typing import Dict, List, Set, Tuple
from collections import defaultdict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WalletGraph:
    """
    Analyze wallet relationships using graph theory
    """
    
    def __init__(self):
        """Initialize wallet graph"""
        self.graph = nx.DiGraph()  # Directed graph for transactions
        self.wallet_metadata = {}
    
    def build_graph(self, transactions: List[Dict]):
        """
        Build graph from transaction history
        
        Args:
            transactions: List of transaction dictionaries
        """
        logger.info(f"Building graph from {len(transactions)} transactions")
        
        self.graph.clear()
        
        for tx in transactions:
            seller = tx.get('seller')
            buyer = tx.get('buyer')
            price = tx.get('price', 0)
            timestamp = tx.get('timestamp', 0)
            nft_id = tx.get('nft_id')
            
            if not seller or not buyer:
                continue
            
            # Add nodes
            if seller not in self.graph:
                self.graph.add_node(seller)
            if buyer not in self.graph:
                self.graph.add_node(buyer)
            
            # Add or update edge
            if self.graph.has_edge(seller, buyer):
                # Update existing edge
                edge_data = self.graph[seller][buyer]
                edge_data['weight'] += 1
                edge_data['total_value'] += price
                edge_data['transactions'].append({
                    'nft_id': nft_id,
                    'price': price,
                    'timestamp': timestamp
                })
            else:
                # Create new edge
                self.graph.add_edge(
                    seller,
                    buyer,
                    weight=1,
                    total_value=price,
                    transactions=[{
                        'nft_id': nft_id,
                        'price': price,
                        'timestamp': timestamp
                    }]
                )
        
        logger.info(f"Graph built: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")
    
    def analyze_wallet(self, wallet_address: str) -> Dict:
        """
        Analyze a wallet's position in the graph
        
        Args:
            wallet_address: Wallet to analyze
            
        Returns:
            Dictionary with graph metrics
        """
        if wallet_address not in self.graph:
            return {
                'in_graph': False,
                'degree': 0,
                'in_degree': 0,
                'out_degree': 0,
                'clustering_coefficient': 0.0,
                'betweenness_centrality': 0.0,
                'pagerank': 0.0
            }
        
        # Basic metrics
        degree = self.graph.degree(wallet_address)
        in_degree = self.graph.in_degree(wallet_address)
        out_degree = self.graph.out_degree(wallet_address)
        
        # Clustering coefficient (for undirected version)
        undirected_graph = self.graph.to_undirected()
        clustering = nx.clustering(undirected_graph, wallet_address)
        
        # Centrality measures
        try:
            betweenness = nx.betweenness_centrality(self.graph)[wallet_address]
        except:
            betweenness = 0.0
        
        try:
            pagerank = nx.pagerank(self.graph)[wallet_address]
        except:
            pagerank = 0.0
        
        return {
            'in_graph': True,
            'degree': degree,
            'in_degree': in_degree,
            'out_degree': out_degree,
            'clustering_coefficient': clustering,
            'betweenness_centrality': betweenness,
            'pagerank': pagerank
        }
    
    def find_connected_wallets(
        self,
        wallet_address: str,
        max_distance: int = 2
    ) -> Dict:
        """
        Find wallets connected to given wallet
        
        Args:
            wallet_address: Starting wallet
            max_distance: Maximum distance to search
            
        Returns:
            Dictionary with connected wallets
        """
        if wallet_address not in self.graph:
            return {
                'direct_connections': [],
                'indirect_connections': [],
                'total_connections': 0
            }
        
        # Direct connections (distance 1)
        direct = set(self.graph.successors(wallet_address)) | set(self.graph.predecessors(wallet_address))
        
        # Indirect connections (distance 2+)
        indirect = set()
        if max_distance > 1:
            for node in direct:
                neighbors = set(self.graph.successors(node)) | set(self.graph.predecessors(node))
                indirect.update(neighbors - direct - {wallet_address})
        
        return {
            'direct_connections': list(direct),
            'indirect_connections': list(indirect),
            'total_connections': len(direct) + len(indirect)
        }
    
    def detect_circular_patterns(
        self,
        wallet_address: str,
        max_length: int = 5
    ) -> List[List[str]]:
        """
        Detect circular transaction patterns
        
        Args:
            wallet_address: Starting wallet
            max_length: Maximum cycle length
            
        Returns:
            List of circular paths
        """
        if wallet_address not in self.graph:
            return []
        
        cycles = []
        
        try:
            # Find simple cycles starting from wallet
            for cycle in nx.simple_cycles(self.graph):
                if wallet_address in cycle and len(cycle) <= max_length:
                    # Rotate cycle to start with wallet_address
                    idx = cycle.index(wallet_address)
                    rotated = cycle[idx:] + cycle[:idx]
                    cycles.append(rotated)
        except:
            pass
        
        return cycles
    
    def detect_sybil_cluster(
        self,
        wallet_address: str,
        similarity_threshold: float = 0.7
    ) -> Dict:
        """
        Detect potential Sybil attack clusters
        Sybil: Multiple wallets controlled by same entity
        
        Args:
            wallet_address: Wallet to analyze
            similarity_threshold: Similarity threshold for clustering
            
        Returns:
            Dictionary with cluster information
        """
        if wallet_address not in self.graph:
            return {
                'is_sybil_cluster': False,
                'cluster_wallets': [],
                'cluster_size': 0
            }
        
        # Get connected wallets
        connected = self.find_connected_wallets(wallet_address, max_distance=2)
        all_connected = set(connected['direct_connections'] + connected['indirect_connections'])
        
        # Analyze transaction patterns for similarity
        cluster_wallets = [wallet_address]
        
        for wallet in all_connected:
            similarity = self._calculate_wallet_similarity(wallet_address, wallet)
            if similarity >= similarity_threshold:
                cluster_wallets.append(wallet)
        
        is_sybil = len(cluster_wallets) >= 3  # At least 3 similar wallets
        
        return {
            'is_sybil_cluster': is_sybil,
            'cluster_wallets': cluster_wallets,
            'cluster_size': len(cluster_wallets)
        }
    
    def _calculate_wallet_similarity(
        self,
        wallet1: str,
        wallet2: str
    ) -> float:
        """
        Calculate similarity between two wallets based on transaction patterns
        
        Args:
            wallet1: First wallet
            wallet2: Second wallet
            
        Returns:
            Similarity score (0-1)
        """
        if wallet1 not in self.graph or wallet2 not in self.graph:
            return 0.0
        
        # Get neighbors
        neighbors1 = set(self.graph.successors(wallet1)) | set(self.graph.predecessors(wallet1))
        neighbors2 = set(self.graph.successors(wallet2)) | set(self.graph.predecessors(wallet2))
        
        # Jaccard similarity
        if not neighbors1 and not neighbors2:
            return 0.0
        
        intersection = len(neighbors1 & neighbors2)
        union = len(neighbors1 | neighbors2)
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def calculate_risk_from_graph(self, wallet_address: str) -> float:
        """
        Calculate risk score based on graph metrics
        
        Args:
            wallet_address: Wallet to analyze
            
        Returns:
            Risk score (0-1)
        """
        if wallet_address not in self.graph:
            return 0.0
        
        metrics = self.analyze_wallet(wallet_address)
        
        # Risk factors
        risk_score = 0.0
        
        # High clustering coefficient suggests tight-knit group (suspicious)
        if metrics['clustering_coefficient'] > 0.7:
            risk_score += 0.3
        
        # High betweenness suggests intermediary role (money laundering)
        if metrics['betweenness_centrality'] > 0.1:
            risk_score += 0.2
        
        # Imbalanced in/out degree suggests one-way flow
        if metrics['in_degree'] > 0 and metrics['out_degree'] > 0:
            ratio = max(metrics['in_degree'], metrics['out_degree']) / min(metrics['in_degree'], metrics['out_degree'])
            if ratio > 5:
                risk_score += 0.2
        
        # Check for circular patterns
        cycles = self.detect_circular_patterns(wallet_address)
        if cycles:
            risk_score += min(0.3, len(cycles) * 0.1)
        
        return min(1.0, risk_score)
    
    def get_graph_statistics(self) -> Dict:
        """
        Get overall graph statistics
        
        Returns:
            Dictionary with graph statistics
        """
        if self.graph.number_of_nodes() == 0:
            return {
                'nodes': 0,
                'edges': 0,
                'density': 0.0,
                'avg_degree': 0.0
            }
        
        return {
            'nodes': self.graph.number_of_nodes(),
            'edges': self.graph.number_of_edges(),
            'density': nx.density(self.graph),
            'avg_degree': sum(dict(self.graph.degree()).values()) / self.graph.number_of_nodes()
        }
