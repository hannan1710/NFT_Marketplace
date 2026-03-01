#!/bin/bash

echo "=========================================="
echo "NFT Contract Comprehensive Test Suite"
echo "=========================================="
echo ""

echo "Running tests with gas reporting..."
npx hardhat test test/NFTContract.comprehensive.test.js --gas-reporter

echo ""
echo "=========================================="
echo "Running coverage analysis..."
echo "=========================================="
npx hardhat coverage --testfiles "test/NFTContract.comprehensive.test.js"

echo ""
echo "=========================================="
echo "Test suite completed!"
echo "=========================================="
