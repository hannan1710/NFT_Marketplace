#!/bin/bash

echo "🧪 Running Hardhat tests..."
echo ""

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    
    # Show gas report if it exists
    if [ -f "gas-report.txt" ]; then
        echo "📊 Gas report saved to: gas-report.txt"
    fi
else
    echo ""
    echo "❌ Tests failed!"
    exit 1
fi
