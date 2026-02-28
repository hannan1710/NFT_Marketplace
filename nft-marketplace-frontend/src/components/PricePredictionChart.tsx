'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';

interface PricePredictionChartProps {
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  historicalData?: Array<{ date: string; price: number }>;
}

export function PricePredictionChart({
  currentPrice,
  predictedPrice,
  confidence,
  historicalData = []
}: PricePredictionChartProps) {
  // Generate chart data
  const chartData = [
    ...historicalData.map(d => ({ name: d.date, actual: d.price, predicted: null })),
    { name: 'Current', actual: currentPrice, predicted: null },
    { name: 'Predicted', actual: null, predicted: predictedPrice },
  ];

  const priceChange = ((predictedPrice - currentPrice) / currentPrice) * 100;
  const isPositive = priceChange > 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-bold text-gray-900">Price Prediction</h3>
        </div>
        <div className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
        </div>
      </div>

      {/* Price Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Current Price</p>
          <p className="text-xl font-bold text-gray-900">{currentPrice.toFixed(2)} ETH</p>
        </div>
        <div className="text-center p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Predicted Price</p>
          <p className="text-xl font-bold text-primary-600">{predictedPrice.toFixed(2)} ETH</p>
        </div>
        <div className="text-center p-4 bg-success-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Confidence</p>
          <p className="text-xl font-bold text-success-600">{(confidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ fill: '#0ea5e9', r: 4 }}
              name="Actual Price"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#22c55e', r: 4 }}
              name="Predicted Price"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Confidence Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Prediction Confidence</span>
          <span className="text-sm font-semibold text-gray-900">{(confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              confidence >= 0.8 ? 'bg-success-600' :
              confidence >= 0.6 ? 'bg-primary-600' :
              'bg-warning-600'
            }`}
            style={{ width: `${confidence * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
