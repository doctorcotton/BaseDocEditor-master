/**
 * 修改追踪系统 Hook
 */

import { useState, useCallback } from 'react';
import { FieldChange } from '../types';
import { saveDraft, removeDraft } from '../utils/draftStorage';

export interface UseChangeTrackingResult {
  changes: Map<string, FieldChange>;
  trackChange: (recordId: string, fieldId: string, fieldName: string, oldValue: any, newValue: any) => void;
  undoChange: (key: string) => void;
  clearChanges: () => void;
  getPendingChanges: () => FieldChange[];
  markAsSynced: (key: string) => void;
  changeCount: number;
  hasChanges: boolean;
}

/**
 * 修改追踪
 */
export function useChangeTracking(): UseChangeTrackingResult {
  const [changes, setChanges] = useState<Map<string, FieldChange>>(new Map());

  /**
   * 记录变更
   */
  const trackChange = useCallback((
    recordId: string,
    fieldId: string,
    fieldName: string,
    oldValue: any,
    newValue: any
  ) => {
    const key = `${recordId}:${fieldId}`;
    
    setChanges(prev => {
      const newChanges = new Map(prev);
      newChanges.set(key, {
        recordId,
        fieldId,
        fieldName,
        oldValue,
        newValue,
        timestamp: Date.now(),
        status: 'pending'
      });
      return newChanges;
    });
    
    // 自动保存到本地存储（草稿功能）
    saveDraft(key, { recordId, fieldId, newValue });
  }, []);

  /**
   * 撤销更改
   */
  const undoChange = useCallback((key: string) => {
    setChanges(prev => {
      const newChanges = new Map(prev);
      newChanges.delete(key);
      return newChanges;
    });
    removeDraft(key);
  }, []);

  /**
   * 清空所有更改
   */
  const clearChanges = useCallback(() => {
    // 清除所有草稿
    changes.forEach((_, key) => {
      removeDraft(key);
    });
    setChanges(new Map());
  }, [changes]);

  /**
   * 获取所有待同步的更改
   */
  const getPendingChanges = useCallback((): FieldChange[] => {
    return Array.from(changes.values()).filter(c => c.status === 'pending');
  }, [changes]);

  /**
   * 标记为已同步
   */
  const markAsSynced = useCallback((key: string) => {
    setChanges(prev => {
      const newChanges = new Map(prev);
      const change = newChanges.get(key);
      if (change) {
        change.status = 'synced';
        newChanges.set(key, change);
      }
      return newChanges;
    });
    // 同步成功后删除草稿
    removeDraft(key);
  }, []);

  return {
    changes,
    trackChange,
    undoChange,
    clearChanges,
    getPendingChanges,
    markAsSynced,
    changeCount: changes.size,
    hasChanges: changes.size > 0
  };
}

