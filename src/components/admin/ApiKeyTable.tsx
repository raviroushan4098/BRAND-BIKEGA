
"use client";

import type { ApiKey } from '@/lib/apiKeyService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, Eye, EyeOff } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface ApiKeyTableProps {
  apiKeys: ApiKey[];
  onEditApiKey: (apiKey: ApiKey) => void;
  onDeleteApiKey: (apiKeyId: string) => void;
  isLoading?: boolean;
}

const ApiKeyTable: React.FC<ApiKeyTableProps> = ({ apiKeys, onEditApiKey, onDeleteApiKey, isLoading }) => {
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '********';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const formatDateSafe = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'MMM d, yyyy HH:mm') : 'Invalid Date';
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service Name</TableHead>
          <TableHead>API Key Value</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.map((apiKey) => (
          <TableRow key={apiKey.id}>
            <TableCell className="font-medium">{apiKey.serviceName}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span>{visibleKeys[apiKey.id] ? apiKey.keyValue : maskApiKey(apiKey.keyValue)}</span>
                <Button variant="ghost" size="icon" onClick={() => toggleVisibility(apiKey.id)} className="h-7 w-7">
                  {visibleKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm max-w-xs truncate" title={apiKey.description}>
              {apiKey.description || <span className="italic">No description</span>}
            </TableCell>
            <TableCell>{formatDateSafe(apiKey.createdAt)}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onEditApiKey(apiKey)} aria-label="Edit API key" disabled={isLoading}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDeleteApiKey(apiKey.id)} className="text-destructive hover:text-destructive" aria-label="Delete API key" disabled={isLoading}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ApiKeyTable;
