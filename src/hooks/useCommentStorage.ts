/**
 * 评论存储管理 Hook
 * 使用评论表格来存储和管理评论
 */

import { useState, useCallback } from 'react';
import { bitable, ITable, IRecord } from '@lark-base-open/js-sdk';
import { Comment, CommentTableConfig } from '../types/comment';

export interface UseCommentStorageResult {
  comments: Map<string, Comment[]>; // key: recordId:fieldId 或 recordId
  loading: boolean;
  error: string | null;
  commentTableConfig: CommentTableConfig | null;
  loadComments: (table: ITable, recordId: string, fieldId?: string) => Promise<Comment[]>;
  addComment: (table: ITable, recordId: string, fieldId: string | undefined, content: string, attachments?: string[]) => Promise<string | null>;
  replyComment: (table: ITable, parentCommentId: string, recordId: string, fieldId: string | undefined, content: string) => Promise<string | null>;
  resolveComment: (table: ITable, commentId: string, resolved: boolean) => Promise<boolean>;
  deleteComment: (table: ITable, commentId: string) => Promise<boolean>;
  getCommentStats: (recordId: string, fieldId?: string) => { total: number; unresolved: number };
  initCommentTable: (base: any) => Promise<CommentTableConfig | null>;
}

/**
 * 评论存储管理
 */
export function useCommentStorage(): UseCommentStorageResult {
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentTableConfig, setCommentTableConfig] = useState<CommentTableConfig | null>(null);

  /**
   * 初始化评论表格
   * 检查是否存在，不存在则创建
   * @param base 多维表格base实例
   * @param mainTableId 主表格ID（用于设置关联字段的目标表格）
   */
  const initCommentTable = useCallback(async (base: any, mainTableId?: string): Promise<CommentTableConfig | null> => {
    try {
      console.log('[CommentStorage] initCommentTable start', { mainTableId });
      // 查找评论表格（名称：BaseDocEditor_评论）
      const tables = await base.getTableMetaList();
      let commentTable = tables.find((t: any) => t.name === 'BaseDocEditor_评论');
      let isNewTable = false;
      
      if (!commentTable) {
        // 创建评论表格
        console.log('[CommentStorage] comment table not found, attempting to create...');
        
        try {
        commentTable = await base.addTable({
          name: 'BaseDocEditor_评论',
          fields: [
            { name: '关联记录', type: 18 }, // SingleLink
            { name: '关联字段ID', type: 1 }, // Text
            { name: '评论内容', type: 1 }, // Text
            { name: '评论者', type: 11 }, // User
            { name: '评论时间', type: 5 }, // DateTime
            { name: '父评论记录', type: 18 }, // SingleLink (指向评论表格自身)
            { name: '已解决', type: 7 }, // Checkbox
            { name: '评论类型', type: 3, options: [{ name: '字段评论' }, { name: '记录评论' }] }, // SingleSelect
            { name: '附件', type: 17 } // Attachment
          ]
        });
          isNewTable = true;
          console.log('[CommentStorage] Comment table created successfully');
        } catch (createErr: any) {
          console.error('[CommentStorage] Failed to create comment table:', createErr);
          
          // 权限不足的错误提示
          if (createErr.message?.includes('permission') || createErr.code === 403) {
            setError('需要创建数据表权限。请联系管理员在多维表格中手动创建名为"BaseDocEditor_评论"的数据表');
          } else {
            setError(`创建评论表失败: ${createErr.message || '未知错误'}`);
          }
          return null;
        }
      }
      
      // 获取表格实例和字段ID
      const commentTableInstance = await base.getTable(commentTable.id);
      const fields = await commentTableInstance.getFieldMetaList();
      
      // 如果表格是新创建的且提供了主表格ID，尝试设置关联字段的目标表格
      if (isNewTable && mainTableId) {
        try {
          const relatedRecordFieldId = fields.find((f: any) => f.name === '关联记录')?.id;
          if (relatedRecordFieldId) {
            const relatedRecordField = await commentTableInstance.getFieldById(relatedRecordFieldId);
            // 设置关联字段的目标表格
            await relatedRecordField.setProperty({ tableId: mainTableId });
            console.log('[CommentStorage] relatedRecord field property set', { relatedRecordFieldId, mainTableId });
          }
          
          // 设置父评论记录字段的目标表格为评论表格自身
          const parentCommentFieldId = fields.find((f: any) => f.name === '父评论记录')?.id;
          if (parentCommentFieldId) {
            const parentCommentField = await commentTableInstance.getFieldById(parentCommentFieldId);
            await parentCommentField.setProperty({ tableId: commentTable.id });
            console.log('[CommentStorage] parentComment field property set', { parentCommentFieldId, tableId: commentTable.id });
          }
        } catch (err: any) {
          console.warn('设置关联字段目标表格失败（可能需要手动配置）:', err);
        }
      }
      
      const fieldIds: CommentTableConfig['fieldIds'] = {
        relatedRecord: fields.find((f: any) => f.name === '关联记录')?.id || '',
        fieldId: fields.find((f: any) => f.name === '关联字段ID')?.id || '',
        content: fields.find((f: any) => f.name === '评论内容')?.id || '',
        author: fields.find((f: any) => f.name === '评论者')?.id || '',
        timestamp: fields.find((f: any) => f.name === '评论时间')?.id || '',
        parentComment: fields.find((f: any) => f.name === '父评论记录')?.id || '',
        resolved: fields.find((f: any) => f.name === '已解决')?.id || '',
        commentType: fields.find((f: any) => f.name === '评论类型')?.id || '',
        attachments: fields.find((f: any) => f.name === '附件')?.id || ''
      };
      
      const config: CommentTableConfig = {
        tableId: commentTable.id,
        fieldIds
      };
      
      setCommentTableConfig(config);
      console.log('[CommentStorage] initCommentTable success', config);
      return config;
    } catch (err: any) {
      console.error('初始化评论表格失败:', err);
      setError(err.message || '初始化评论表格失败');
      return null;
    }
  }, []);

  /**
   * 加载评论
   */
  const loadComments = useCallback(async (
    table: ITable,
    recordId: string,
    fieldId?: string
  ): Promise<Comment[]> => {
    if (!commentTableConfig) {
      return [];
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const commentTable = await bitable.base.getTable(commentTableConfig.tableId);
      
      // 获取所有评论记录
      const records = await commentTable.getRecords({ pageSize: 5000 });
      
      // 筛选符合条件的评论
      const filteredComments: Comment[] = [];
      
      for (const record of records.records) {
        const relatedRecordId = record.fields[commentTableConfig.fieldIds.relatedRecord];
        const commentFieldId = record.fields[commentTableConfig.fieldIds.fieldId];
        
        // 检查是否匹配
        const recordMatch = Array.isArray(relatedRecordId) 
          ? relatedRecordId.some((r: any) => (r && typeof r === 'object' && (r.recordId || r.id)) === recordId)
          : (relatedRecordId && typeof relatedRecordId === 'object' && ((relatedRecordId as any).recordId || (relatedRecordId as any).id)) === recordId;
        
        if (recordMatch) {
          // 如果指定了fieldId，只返回该字段的评论；否则返回所有评论
          const fieldIdValue = typeof commentFieldId === 'string' ? commentFieldId : undefined;
          if (!fieldId || fieldIdValue === fieldId) {
            const contentValue = record.fields[commentTableConfig.fieldIds.content];
            const authorValue = record.fields[commentTableConfig.fieldIds.author];
            const timestampValue = record.fields[commentTableConfig.fieldIds.timestamp];
            const resolvedValue = record.fields[commentTableConfig.fieldIds.resolved];
            const parentCommentValue = record.fields[commentTableConfig.fieldIds.parentComment];
            const attachmentsValue = record.fields[commentTableConfig.fieldIds.attachments];
            const commentTypeValue = record.fields[commentTableConfig.fieldIds.commentType];
            
            const comment: Comment = {
              id: record.recordId,
              recordId,
              fieldId: fieldIdValue,
              content: typeof contentValue === 'string' ? contentValue : String(contentValue || ''),
              author: Array.isArray(authorValue)
                ? authorValue.map((u: any) => (u && typeof u === 'object' && 'name' in u) ? u.name : String(u)).join(', ')
                : (authorValue && typeof authorValue === 'object' && 'name' in authorValue) ? (authorValue as any).name : '未知',
              authorId: Array.isArray(authorValue)
                ? (authorValue[0] && typeof authorValue[0] === 'object' && 'id' in authorValue[0]) ? (authorValue[0] as any).id : ''
                : (authorValue && typeof authorValue === 'object' && 'id' in authorValue) ? (authorValue as any).id : '',
              timestamp: typeof timestampValue === 'number' ? timestampValue : (typeof timestampValue === 'string' ? parseInt(timestampValue) : Date.now()),
              resolved: typeof resolvedValue === 'boolean' ? resolvedValue : Boolean(resolvedValue || false),
              parentId: (parentCommentValue && typeof parentCommentValue === 'object' && 'recordId' in parentCommentValue) ? (parentCommentValue as any).recordId : undefined,
              attachments: Array.isArray(attachmentsValue)
                ? attachmentsValue.map((a: any) => (a && typeof a === 'object' && ('token' in a || 'id' in a)) ? (a.token || a.id) : String(a))
                : [],
              commentType: (commentTypeValue && typeof commentTypeValue === 'object' && 'text' in commentTypeValue && (commentTypeValue as any).text === '记录评论') ? 'record' : 'field'
            };
            
            filteredComments.push(comment);
          }
        }
      }
      
      // 按时间排序
      filteredComments.sort((a, b) => b.timestamp - a.timestamp);
      
      // 更新缓存
      const key = fieldId ? `${recordId}:${fieldId}` : recordId;
      setComments((prev: Map<string, Comment[]>) => {
        const newMap = new Map(prev);
        newMap.set(key, filteredComments);
        return newMap;
      });
      
      return filteredComments;
    } catch (err: any) {
      console.error('加载评论失败:', err);
      setError(err.message || '加载评论失败');
      return [];
    } finally {
      setLoading(false);
    }
  }, [commentTableConfig]);

  /**
   * 添加评论
   */
  const addComment = useCallback(async (
    table: ITable,
    recordId: string,
    fieldId: string | undefined,
    content: string,
    attachments?: string[]
  ): Promise<string | null> => {
    if (!commentTableConfig) {
      setError('评论表格未初始化');
      return null;
    }
    
    try {
      const commentTable = await bitable.base.getTable(commentTableConfig.tableId);
      const userId = await bitable.bridge.getUserId();
      
      // 构建评论记录
      const fields: Record<string, any> = {
        [commentTableConfig.fieldIds.relatedRecord]: [recordId],
        [commentTableConfig.fieldIds.content]: content,
        [commentTableConfig.fieldIds.author]: [{ id: userId, name: '用户' }],
        [commentTableConfig.fieldIds.timestamp]: Date.now(),
        [commentTableConfig.fieldIds.resolved]: false,
        [commentTableConfig.fieldIds.commentType]: fieldId ? '字段评论' : '记录评论'
      };
      
      if (fieldId) {
        fields[commentTableConfig.fieldIds.fieldId] = fieldId;
      }
      
      if (attachments && attachments.length > 0) {
        fields[commentTableConfig.fieldIds.attachments] = attachments.map(token => ({ token }));
      }
      
      // 创建评论记录
      const result = await commentTable.addRecord({ fields });
      
      // 重新加载评论
      await loadComments(table, recordId, fieldId);
      
      return (result as any).recordId || String(result);
    } catch (err: any) {
      console.error('添加评论失败:', err);
      setError(err.message || '添加评论失败');
      return null;
    }
  }, [commentTableConfig, loadComments]);

  /**
   * 回复评论
   */
  const replyComment = useCallback(async (
    table: ITable,
    parentCommentId: string,
    recordId: string,
    fieldId: string | undefined,
    content: string
  ): Promise<string | null> => {
    if (!commentTableConfig) {
      setError('评论表格未初始化');
      return null;
    }
    
    try {
      const commentTable = await bitable.base.getTable(commentTableConfig.tableId);
      const userId = await bitable.bridge.getUserId();
      
      const fields: Record<string, any> = {
        [commentTableConfig.fieldIds.relatedRecord]: [recordId],
        [commentTableConfig.fieldIds.content]: content,
        [commentTableConfig.fieldIds.author]: [{ id: userId, name: '用户' }],
        [commentTableConfig.fieldIds.timestamp]: Date.now(),
        [commentTableConfig.fieldIds.resolved]: false,
        [commentTableConfig.fieldIds.parentComment]: [parentCommentId],
        [commentTableConfig.fieldIds.commentType]: fieldId ? '字段评论' : '记录评论'
      };
      
      if (fieldId) {
        fields[commentTableConfig.fieldIds.fieldId] = fieldId;
      }
      
      const result = await commentTable.addRecord({ fields });
      
      // 重新加载评论
      await loadComments(table, recordId, fieldId);
      
      return (result as any).recordId || String(result);
    } catch (err: any) {
      console.error('回复评论失败:', err);
      setError(err.message || '回复评论失败');
      return null;
    }
  }, [commentTableConfig, loadComments]);

  /**
   * 标记评论为已解决/未解决
   */
  const resolveComment = useCallback(async (
    table: ITable,
    commentId: string,
    resolved: boolean
  ): Promise<boolean> => {
    if (!commentTableConfig) {
      return false;
    }
    
    try {
      const commentTable = await bitable.base.getTable(commentTableConfig.tableId);
      await commentTable.setCellValue(commentTableConfig.fieldIds.resolved, commentId, resolved);
      
      // 更新缓存
      setComments((prev: Map<string, Comment[]>) => {
        const newMap = new Map(prev);
        for (const [key, commentList] of newMap.entries()) {
          const updated = commentList.map((c: Comment) => 
            c.id === commentId ? { ...c, resolved } : c
          );
          newMap.set(key, updated);
        }
        return newMap;
      });
      
      return true;
    } catch (err: any) {
      console.error('更新评论状态失败:', err);
      return false;
    }
  }, [commentTableConfig]);

  /**
   * 删除评论
   */
  const deleteComment = useCallback(async (
    table: ITable,
    commentId: string
  ): Promise<boolean> => {
    if (!commentTableConfig) {
      return false;
    }
    
    try {
      const commentTable = await bitable.base.getTable(commentTableConfig.tableId);
      await commentTable.deleteRecord(commentId);
      
      // 更新缓存
      setComments((prev: Map<string, Comment[]>) => {
        const newMap = new Map(prev);
        for (const [key, commentList] of newMap.entries()) {
          const filtered = commentList.filter((c: Comment) => c.id !== commentId);
          newMap.set(key, filtered);
        }
        return newMap;
      });
      
      return true;
    } catch (err: any) {
      console.error('删除评论失败:', err);
      return false;
    }
  }, [commentTableConfig]);

  /**
   * 获取评论统计
   */
  const getCommentStats = useCallback((recordId: string, fieldId?: string): { total: number; unresolved: number } => {
    const key = fieldId ? `${recordId}:${fieldId}` : recordId;
    const commentList = comments.get(key) || [];
    
    return {
      total: commentList.length,
      unresolved: commentList.filter((c: Comment) => !c.resolved).length
    };
  }, [comments]);

  return {
    comments,
    loading,
    error,
    commentTableConfig,
    loadComments,
    addComment,
    replyComment,
    resolveComment,
    deleteComment,
    getCommentStats,
    initCommentTable
  };
}

