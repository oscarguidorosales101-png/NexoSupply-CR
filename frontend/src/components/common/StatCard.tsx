import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  comparisonText?: string;
  icon: LucideIcon;
  iconColor?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose';
  sparklineVariant?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  comparisonText = 'vs. mes anterior',
  icon: Icon,
  iconColor = 'blue',
  sparklineVariant = 'up',
}) => {
  const iconThemes = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-rose-600',
    neutral: 'text-slate-500',
  };

  const sparklinePaths = {
    up: 'M0 24 C 20 22, 40 18, 60 12 C 80 8, 100 2, 120 4',
    down: 'M0 6 C 20 8, 40 12, 60 18 C 80 22, 100 26, 120 24',
    neutral: 'M0 16 C 20 14, 40 18, 60 15 C 80 17, 100 15, 120 16',
  };

  const sparklineStroke = {
    blue: '#3B82F6',
    emerald: '#10B981',
    purple: '#8B5CF6',
    amber: '#F59E0B',
    rose: '#EF4444',
  }[iconColor];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-3">
        <div className={`p-2.5 rounded-xl ${iconThemes[iconColor]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-slate-500">{title}</span>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50">
        <div className="flex items-center space-x-1.5">
          {change && (
            <div className={`flex items-center text-xs font-semibold ${trendColors[trend]}`}>
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
              {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
              {trend === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
              {change}
            </div>
          )}
          {comparisonText && (
            <span className="text-xs text-slate-400">{comparisonText}</span>
          )}
        </div>

        {/* Micro Sparkline */}
        <div className="w-20 h-6">
          <svg viewBox="0 0 120 30" fill="none" className="w-full h-full overflow-visible">
            <path
              d={sparklinePaths[sparklineVariant]}
              fill="none"
              stroke={sparklineStroke}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
