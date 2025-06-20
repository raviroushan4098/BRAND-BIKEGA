
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TooltipProps } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { DailyChartDataPoint } from '@/app/analytics/page'; 
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface MetricConfig {
  key: keyof DailyChartDataPoint;
  name: string;
  color: string;
  icon?: React.ElementType;
}

interface DailyPerformanceChartProps {
  data: DailyChartDataPoint[];
  metrics: MetricConfig[];
  xAxisDataKey?: string; 
  title: string;
  platformIcon: React.ElementType;
  isLoading: boolean;
  error: string | null;
}

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dateLabel = label ? format(parseISO(label), 'MMM d, yyyy') : '';
    return (
      <div className="bg-background/90 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
        <p className="font-semibold text-sm mb-1">{dateLabel}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center text-xs">
            <span style={{ color: entry.color, marginRight: '4px' }}>●</span>
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium ml-1.5">{Number(entry.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const DailyPerformanceChart: React.FC<DailyPerformanceChartProps> = ({
  data,
  metrics,
  xAxisDataKey = "date",
  title,
  platformIcon: PlatformIcon,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            {PlatformIcon && <PlatformIcon className="h-6 w-6 text-primary" />}
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading chart data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            {PlatformIcon && <PlatformIcon className="h-6 w-6 text-destructive" />}
            <CardTitle className="text-xl font-semibold text-destructive">Error Loading Chart</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (data.length === 0) {
     return (
        <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            {PlatformIcon && <PlatformIcon className="h-6 w-6 text-primary" />}
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No data to display for the selected period.</p>
        </CardContent>
      </Card>
     );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          {PlatformIcon && <PlatformIcon className="h-7 w-7 text-primary" />}
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </div>
        <CardDescription>Daily trends for key metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey={xAxisDataKey}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => format(parseISO(value), "MMM d")}
            />
            <YAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[
                0, 
                (dataMax: number) => Math.max(500, dataMax || 0)
              ]}
              allowDataOverflow={false}
              tickCount={8} 
              tickFormatter={(value) => {
                if (typeof value !== 'number') return String(value);
                if (value < 1000) return value.toLocaleString(); 
                if (value >= 1000000) {
                  const num = value / 1000000;
                  return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}M`;
                }
                const num = value / 1000;
                return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}K`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
            <Legend
              formatter={(value, entry) => {
                const metric = metrics.find(m => m.name === value);
                const IconComponent = metric?.icon;
                return (
                  <span className="flex items-center text-xs">
                    {IconComponent && <IconComponent className="h-3 w-3 mr-1" style={{color: entry.color}} />}
                    {value}
                  </span>
                );
              }}
            />
            {metrics.map((metric) => (
              <Line
                key={metric.key as string}
                type="monotone"
                dataKey={metric.key as string}
                name={metric.name}
                stroke={metric.color}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, fill: metric.color }}
                activeDot={{ r: 5, strokeWidth: 2 }}
                connectNulls={true} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailyPerformanceChart;
