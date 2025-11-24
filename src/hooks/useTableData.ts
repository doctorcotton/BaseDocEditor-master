/**
 * 多维表格数据管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { bitable, ITable, IRecord, IFieldMeta } from '@lark-base-open/js-sdk';

export interface UseTableDataResult {
  tables: Array<{ id: string; name: string }>;
  currentTable: ITable | null;
  records: IRecord[];
  fields: IFieldMeta[];
  loading: boolean;
  error: string | null;
  selectTable: (tableId: string) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * 多维表格数据管理
 */
export function useTableData(): UseTableDataResult {
  const [tables, setTables] = useState<Array<{ id: string; name: string }>>([]);
  const [currentTable, setCurrentTable] = useState<ITable | null>(null);
  const [records, setRecords] = useState<IRecord[]>([]);
  const [fields, setFields] = useState<IFieldMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 选择表格并加载数据
   */
  const selectTable = useCallback(async (tableId: string) => {
    console.log('[useTableData] selectTable called', { tableId });
    setLoading(true);
    setError(null);
    
    try {
      const table = await bitable.base.getTable(tableId);
      console.log('[useTableData] table loaded', { tableId, tableName: (table as any).name });
      setCurrentTable(table);
      
      // 加载字段元数据
      const fieldList = await table.getFieldMetaList();
      console.log('[useTableData] fields loaded', { count: fieldList.length });
      setFields(fieldList);
      
      // 加载记录数据
      const recordIdList = await table.getRecordIdList();
      console.log('[useTableData] record ids loaded', { count: recordIdList.length });
      const recordList: IRecord[] = [];
      
      // 批量获取记录（每次最多100条）
      const batchSize = 100;
      for (let i = 0; i < recordIdList.length; i += batchSize) {
        const batch = recordIdList.slice(i, i + batchSize);
        const recordValues = await table.getRecordsByIds(batch);
        // 将 IRecordValue 转换为 IRecord
        const records = recordValues.map((recordValue, index) => ({
          recordId: batch[index],
          fields: recordValue as any
        }));
        recordList.push(...records);
      }
      
      console.log('[useTableData] records loaded', { count: recordList.length });
      setRecords(recordList);
      
    } catch (err: any) {
      console.error('[useTableData] 加载表格数据失败:', err);
      setError(err.message || '加载表格数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 加载所有表格列表
   */
  const loadTables = useCallback(async () => {
    try {
      console.log('[useTableData] 开始加载表格列表...');
      const tableList = await bitable.base.getTableMetaList();
      console.log('[useTableData] 表格列表:', tableList);
      setTables(tableList.map(t => ({ id: t.id, name: t.name })));
      
      // 默认选择第一个表格
      if (tableList.length > 0) {
        console.log('[useTableData] 自动选择第一个表格:', tableList[0].id);
        await selectTable(tableList[0].id);
      }
    } catch (err: any) {
      console.error('[useTableData] 加载表格列表失败:', err);
      setError(err.message || '加载表格列表失败');
    }
  }, [selectTable]);


  /**
   * 重新加载当前表格数据
   */
  const reload = useCallback(async () => {
    if (currentTable) {
      setLoading(true);
      try {
        // 加载字段元数据
        const fieldList = await currentTable.getFieldMetaList();
        setFields(fieldList);
        
        // 加载记录数据
        const recordIdList = await currentTable.getRecordIdList();
        const recordList: IRecord[] = [];
        
        // 批量获取记录（每次最多100条）
        const batchSize = 100;
        for (let i = 0; i < recordIdList.length; i += batchSize) {
          const batch = recordIdList.slice(i, i + batchSize);
          const recordValues = await currentTable.getRecordsByIds(batch);
          // 将 IRecordValue 转换为 IRecord
          const records = recordValues.map((recordValue, index) => ({
            recordId: batch[index],
            fields: recordValue as any
          }));
          recordList.push(...records);
        }
        
        setRecords(recordList);
      } catch (err: any) {
        console.error('重新加载数据失败:', err);
        setError(err.message || '重新加载数据失败');
      } finally {
        setLoading(false);
      }
    }
  }, [currentTable]);

  // 初始化：加载表格列表（只执行一次）
  useEffect(() => {
    loadTables();
  }, []);

  return {
    tables,
    currentTable,
    records,
    fields,
    loading,
    error,
    selectTable,
    reload
  };
}

