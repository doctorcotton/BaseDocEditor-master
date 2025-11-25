/**
 * 文档同步管理 Hook
 */

import { useState, useCallback } from 'react';
import { ITable, IFieldMeta } from '@lark-base-open/js-sdk';
import { FieldChange, SyncResult } from '../types';
import { normalizeFieldValue } from '../utils/fieldFormatter';

export interface UseDocumentSyncResult {
  syncing: boolean;
  syncResult: SyncResult | null;
  syncChanges: (table: ITable, changes: FieldChange[], fields?: IFieldMeta[]) => Promise<boolean>;
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
    changes: FieldChange[],
    fields?: IFieldMeta[]
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
        
        // 查找字段元数据
        const fieldMeta = fields?.find(f => f.id === change.fieldId);
        
        // 规范化字段值
        const normalizedValue = normalizeFieldValue(
          change.newValue,
          fieldMeta?.type || 1, // 默认为文本类型
          fieldMeta
        );
        
        recordChanges.get(change.recordId)![change.fieldId] = normalizedValue;
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

