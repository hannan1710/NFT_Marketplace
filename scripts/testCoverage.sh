#!/bin/bash

echo "🧪 Running test coverage..."
echo ""

# Clean previous coverage
rm -rf coverage
rm -rf coverage.json

# Run coverage
npx hardhat coverage

# Check if coverage was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Coverage complete!"
    echo ""
    echo "📊 Coverage report available at: coverage/index.html"
    echo ""
    
    # Open coverage report (optional)
    if command -v open &> /dev/null; then
        echo "Opening coverage report..."
        open coverage/index.html
    elif command -v xdg-open &> /dev/null; then
        echo "Opening coverage report..."
        xdg-open coverage/index.html
    fi
else
    echo ""
    echo "❌ Coverage failed!"
    exit 1
fi
