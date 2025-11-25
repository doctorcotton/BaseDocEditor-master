/**
 * 撤销/重做功能 Hook
 * 支持 Ctrl+Z 撤销和 Ctrl+Shift+Z 重做
 */

import { useState, useCallback, useEffect } from 'react';

export interface UndoableAction {
  fieldId: string;
  fieldName: string;
  recordId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

interface UseUndoRedoOptions {
  maxHistory?: number; // 最大历史记录数
  onUndo?: (action: UndoableAction) => Promise<boolean>; // 撤销回调
  onRedo?: (action: UndoableAction) => Promise<boolean>; // 重做回调
}

export interface UseUndoRedoResult {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: UndoableAction[];
  redoStack: UndoableAction[];
  pushAction: (action: Omit<UndoableAction, 'timestamp'>) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clearHistory: () => void;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}): UseUndoRedoResult {
  const { maxHistory = 50, onUndo, onRedo } = options;
  
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  /**
   * 添加新操作到撤销栈
   */
  const pushAction = useCallback((action: Omit<UndoableAction, 'timestamp'>) => {
    const fullAction: UndoableAction = {
      ...action,
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      const newStack = [...prev, fullAction];
      // 限制历史记录数量
      if (newStack.length > maxHistory) {
        return newStack.slice(-maxHistory);
      }
      return newStack;
    });

    // 新操作会清空重做栈
    setRedoStack([]);
  }, [maxHistory]);

  /**
   * 撤销操作
   */
  const undo = useCallback(async (): Promise<boolean> => {
    if (undoStack.length === 0) {
      return false;
    }

    const action = undoStack[undoStack.length - 1];
    
    // 执行撤销回调
    if (onUndo) {
      const success = await onUndo(action);
      if (!success) {
        return false;
      }
    }

    // 从撤销栈移除，添加到重做栈
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);

    return true;
  }, [undoStack, onUndo]);

  /**
   * 重做操作
   */
  const redo = useCallback(async (): Promise<boolean> => {
    if (redoStack.length === 0) {
      return false;
    }

    const action = redoStack[redoStack.length - 1];
    
    // 执行重做回调
    if (onRedo) {
      const success = await onRedo(action);
      if (!success) {
        return false;
      }
    }

    // 从重做栈移除，添加到撤销栈
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);

    return true;
  }, [redoStack, onRedo]);

  /**
   * 清空历史记录
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    canUndo,
    canRedo,
    undoStack,
    redoStack,
    pushAction,
    undo,
    redo,
    clearHistory
  };
}

/**
 * 全局键盘快捷键监听 Hook
 */
export function useUndoRedoKeyboard(
  undo: () => Promise<boolean>,
  redo: () => Promise<boolean>,
  canUndo: boolean,
  canRedo: boolean,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // 检查是否在输入框中，如果是则不拦截
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      // 在输入框中时，让浏览器处理原生撤销
      if (isInput) {
        return;
      }

      // Ctrl+Z (Windows) 或 Cmd+Z (Mac) - 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          await undo();
        }
        return;
      }

      // Ctrl+Shift+Z (Windows) 或 Cmd+Shift+Z (Mac) - 重做
      // 或 Ctrl+Y (Windows) - 重做
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        if (canRedo) {
          e.preventDefault();
          await redo();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, enabled]);
}

