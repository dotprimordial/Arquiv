'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface RateLimitStatus {
  clientIp: string;
  rateLimit: {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetTime?: string;
    reason?: string;
  };
  stats?: {
    totalSearches: number;
    searchesLastDay: number;
    semanticSearches: number;
  };
}

interface SearchRateLimitDisplayProps {
  onLimitExceeded?: () => void;
  compact?: boolean;
}

export function SearchRateLimitDisplay({ onLimitExceeded, compact = false }: SearchRateLimitDisplayProps) {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/search/rate-limit');
        
        if (!response.ok) {
          throw new Error('Erro ao buscar status de limite');
        }

        const data: RateLimitStatus = await response.json();
        setStatus(data);

        if (!data.rateLimit.allowed && onLimitExceeded) {
          onLimitExceeded();
        }
      } catch (err) {
        const error = err as Error;
        console.error('[SearchRateLimitDisplay] Error fetching rate limit:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch on mount and set up interval to refresh every 30 seconds
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);

    return () => clearInterval(interval);
  }, [onLimitExceeded]);

  if (loading || !status) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        {status.rateLimit.allowed ? (
          <>
            <CheckCircle size={14} />
            <span>{status.rateLimit.remaining}/{status.rateLimit.limit} buscas hoje</span>
          </>
        ) : (
          <>
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-red-600 dark:text-red-400">Limite diário atingido</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
      {/* Limit Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status.rateLimit.allowed ? (
            <>
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm font-medium">Dentro do limite</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-sm font-medium">Limite excedido</span>
            </>
          )}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {status.rateLimit.remaining}/{status.rateLimit.limit}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            status.rateLimit.allowed
              ? 'bg-blue-600'
              : 'bg-red-600'
          }`}
          style={{
            width: `${(status.rateLimit.remaining / status.rateLimit.limit) * 100}%`,
          }}
        />
      </div>

      {/* Message */}
      {status.rateLimit.reason && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {status.rateLimit.reason}
        </p>
      )}

      {/* Stats */}
      {status.stats && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white dark:bg-gray-800 rounded p-2">
            <p className="text-gray-600 dark:text-gray-400">Hoje</p>
            <p className="font-semibold">{status.stats.searchesLastDay}/{status.rateLimit.limit}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded p-2">
            <p className="text-gray-600 dark:text-gray-400">Total</p>
            <p className="font-semibold">{status.stats.totalSearches}</p>
          </div>
        </div>
      )}

      {/* Reset Time */}
      {status.rateLimit.resetTime && !status.rateLimit.allowed && (
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-2">
          <Clock size={12} />
          <span>Reinicia em: {new Date(status.rateLimit.resetTime).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}

export default SearchRateLimitDisplay;
