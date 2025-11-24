/**
 * 文档同步管理 Hook
 */

import { useState, useCallback } from 'react';
import { ITable } from '@lark-base-open/js-sdk';
import { FieldChange, SyncResult } from '../types';

export interface UseDocumentSyncResult {
  syncing: boolean;
  syncResult: SyncResult | null;
  syncChanges: (table: ITable, changes: FieldChange[]) => Promise<boolean>;
  clearSyncResult: () => void;
}

/**
 * 文档同步管理
 */
export function useDocumentSync(): UseDocumentSyncResult {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  /**
   * 同步变更到多维表格
   */
  const syncChanges = useCallback(async (
    table: ITable,
    changes: FieldChange[]
  ): Promise<boolean> => {
    if (changes.length === 0) {
      return false;
    }

    setSyncing(true);
    setSyncResult(null);
    
    try {
      // 按记录分组，每个记录可能有多个字段修改
      const recordChanges = new Map<string, Record<string, any>>();
      
      for (const change of changes) {
        if (!recordChanges.has(change.recordId)) {
          recordChanges.set(change.recordId, {});
        }
        recordChanges.get(change.recordId)![change.fieldId] = change.newValue;
      }
      
      // 批量更新记录
      const updates = Array.from(recordChanges.entries()).map(([recordId, fields]) => ({
        recordId,
        fields
      }));
      
      // 使用 setRecords 批量更新
      await table.setRecords(updates);
      
      setSyncResult({
        success: true,
        count: updates.length,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error: any) {
      console.error('同步失败:', error);
      setSyncResult({
        success: false,
        error: error.message || '同步失败',
        timestamp: Date.now()
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * 清除同步结果
   */
  const clearSyncResult = useCallback(() => {
    setSyncResult(null);
  }, []);

  return {
    syncing,
    syncResult,
    syncChanges,
    clearSyncResult
  };
}

