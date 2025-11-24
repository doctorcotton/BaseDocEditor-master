/**
 * 模板存储管理 Hook
 * 负责模板的读取、保存、复制等操作
 * 使用独立的 BaseDocEditor_模板 表存储模板
 */

import { useState, useCallback } from 'react';
import { bitable, ITable, FieldType } from '@lark-base-open/js-sdk';
import { Template } from '../types/template';
import { serializeTemplate, deserializeTemplate } from '../utils/templateSerializer';

export interface TemplateTableConfig {
  tableId: string;
  fieldIds: {
    name: string;        // 模板名称
    content: string;     // 模板内容（JSON）
    description: string; // 模板描述
    createdAt: string;   // 创建时间
    updatedAt: string;   // 更新时间
  };
}

export interface UseTemplateStorageResult {
  templates: Template[];
  loading: boolean;
  error: string | null;
  templateTableConfig: TemplateTableConfig | null;
  loadTemplates: () => Promise<void>;
  saveTemplate: (template: Template) => Promise<boolean>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
  copyTemplate: (template: Template, newName: string) => Template;
  exportTemplate: (template: Template) => string;
  importTemplate: (code: string) => Template | null;
  initTemplateTable: (base: any) => Promise<TemplateTableConfig | null>;
}

/**
 * 模板存储管理
 */
export function useTemplateStorage(): UseTemplateStorageResult {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateTableConfig, setTemplateTableConfig] = useState<TemplateTableConfig | null>(null);

  /**
   * 从模板表加载所有模板
   */
  const loadTemplates = useCallback(async () => {
    if (!templateTableConfig) {
      console.warn('[TemplateStorage] loadTemplates called but templateTableConfig is null');
      return;
    }

    console.log('[TemplateStorage] loadTemplates start', { tableId: templateTableConfig.tableId });
    setLoading(true);
    setError(null);
    
    try {
      const base = bitable.base;
      const templateTable = await base.getTable(templateTableConfig.tableId);
      const records = await templateTable.getRecords({ pageSize: 5000 });
      const loadedTemplates: Template[] = [];
      
      for (const record of records.records) {
        try {
          const contentCell = await templateTable.getCellValue(
            templateTableConfig.fieldIds.content,
            record.recordId
          );
          
          if (contentCell && typeof contentCell === 'string') {
            const template = deserializeTemplate(contentCell);
            if (template) {
              loadedTemplates.push(template);
            }
          }
        } catch (err) {
          console.warn('[TemplateStorage] Failed to load template from record:', record.recordId, err);
        }
      }
      
      setTemplates(loadedTemplates);
      console.log('[TemplateStorage] loadTemplates success', { count: loadedTemplates.length });
    } catch (err: any) {
      console.error('[TemplateStorage] 加载模板失败:', err);
      setError(err.message || '加载模板失败');
    } finally {
      setLoading(false);
    }
  }, [templateTableConfig]);

  /**
   * 保存模板到模板表
   * 如果模板已存在（根据ID），则更新；否则创建新记录
   */
  const saveTemplate = useCallback(async (template: Template): Promise<boolean> => {
    if (!templateTableConfig) {
      console.error('[TemplateStorage] saveTemplate called but templateTableConfig is null');
      return false;
    }

    console.log('[TemplateStorage] saveTemplate start', { 
      tableId: templateTableConfig.tableId, 
      templateId: template.id, 
      templateName: template.name,
      elementCount: template.elements.length,
      fieldIds: templateTableConfig.fieldIds
    });

    try {
      const base = bitable.base;
      console.log('[TemplateStorage] getting template table...');
      const templateTable = await base.getTable(templateTableConfig.tableId);
      console.log('[TemplateStorage] template table retrieved');
      
      // 更新模板的更新时间
      const updatedTemplate: Template = {
        ...template,
        updatedAt: Date.now()
      };

      // 序列化模板内容
      console.log('[TemplateStorage] serializing template...');
      const serializedContent = serializeTemplate(updatedTemplate);
      console.log('[TemplateStorage] serialized content length:', serializedContent.length);

      // 查找是否已存在该模板的记录
      console.log('[TemplateStorage] checking for existing record...');
      const records = await templateTable.getRecords({ pageSize: 5000 });
      console.log('[TemplateStorage] found', records.records.length, 'records');
      let existingRecordId: string | null = null;

      for (const record of records.records) {
        const contentCell = await templateTable.getCellValue(
          templateTableConfig.fieldIds.content,
          record.recordId
        );
        
        if (contentCell && typeof contentCell === 'string') {
          const existingTemplate = deserializeTemplate(contentCell);
          if (existingTemplate && existingTemplate.id === template.id) {
            existingRecordId = record.recordId;
            console.log('[TemplateStorage] found existing record:', existingRecordId);
            break;
          }
        }
      }

      if (existingRecordId) {
        // 更新现有记录
        console.log('[TemplateStorage] Updating existing record:', existingRecordId);
        await templateTable.setCellValue(
          templateTableConfig.fieldIds.name,
          existingRecordId,
          updatedTemplate.name
        );
        console.log('[TemplateStorage] name updated');
        await templateTable.setCellValue(
          templateTableConfig.fieldIds.content,
          existingRecordId,
          serializedContent
        );
        console.log('[TemplateStorage] content updated');
        await templateTable.setCellValue(
          templateTableConfig.fieldIds.updatedAt,
          existingRecordId,
          updatedTemplate.updatedAt
        );
        console.log('[TemplateStorage] updatedAt updated');
      } else {
        // 创建新记录
        console.log('[TemplateStorage] Creating new record with fields:', {
          name: updatedTemplate.name,
          contentLength: serializedContent.length,
          description: updatedTemplate.description || '',
          createdAt: updatedTemplate.createdAt,
          updatedAt: updatedTemplate.updatedAt
        });
        const newRecordId = await templateTable.addRecord({
          fields: {
            [templateTableConfig.fieldIds.name]: updatedTemplate.name,
            [templateTableConfig.fieldIds.content]: serializedContent,
            [templateTableConfig.fieldIds.description]: updatedTemplate.description || '',
            [templateTableConfig.fieldIds.createdAt]: updatedTemplate.createdAt,
            [templateTableConfig.fieldIds.updatedAt]: updatedTemplate.updatedAt
          }
        });
        console.log('[TemplateStorage] new record created:', newRecordId);
      }

      // 更新本地模板列表
      setTemplates(prev => {
        const index = prev.findIndex(t => t.id === updatedTemplate.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedTemplate;
          return next;
        }
        return [...prev, updatedTemplate];
      });

      console.log('[TemplateStorage] saveTemplate success');
      return true;
    } catch (err: any) {
      console.error('[TemplateStorage] 保存模板失败:', err);
      setError(err.message || '保存模板失败');
      return false;
    }
  }, [templateTableConfig]);

  /**
   * 删除模板
   */
  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    if (!templateTableConfig) {
      console.error('[TemplateStorage] deleteTemplate called but templateTableConfig is null');
      return false;
    }

    console.log('[TemplateStorage] deleteTemplate start', { templateId });

    try {
      const base = bitable.base;
      const templateTable = await base.getTable(templateTableConfig.tableId);
      const records = await templateTable.getRecords({ pageSize: 5000 });

      // 查找要删除的记录
      for (const record of records.records) {
        const contentCell = await templateTable.getCellValue(
          templateTableConfig.fieldIds.content,
          record.recordId
        );
        
        if (contentCell && typeof contentCell === 'string') {
          const template = deserializeTemplate(contentCell);
          if (template && template.id === templateId) {
            await templateTable.deleteRecord(record.recordId);
            
            // 更新本地模板列表
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            
            console.log('[TemplateStorage] deleteTemplate success');
            return true;
          }
        }
      }

      console.warn('[TemplateStorage] Template not found:', templateId);
      return false;
    } catch (err: any) {
      console.error('[TemplateStorage] 删除模板失败:', err);
      setError(err.message || '删除模板失败');
      return false;
    }
  }, [templateTableConfig]);

  /**
   * 复制模板并重命名
   */
  const copyTemplate = useCallback((template: Template, newName: string): Template => {
    const newId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ...template,
      id: newId,
      name: newName,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }, []);

  /**
   * 导出模板为JS代码
   */
  const exportTemplate = useCallback((template: Template): string => {
    return serializeTemplate(template);
  }, []);

  /**
   * 从JS代码导入模板
   */
  const importTemplate = useCallback((code: string): Template | null => {
    return deserializeTemplate(code);
  }, []);

  /**
   * 初始化模板表
   * 检查是否存在 BaseDocEditor_模板 表，不存在则创建
   */
  const initTemplateTable = useCallback(async (base: any): Promise<TemplateTableConfig | null> => {
    console.log('[TemplateStorage] initTemplateTable start');
    
    try {
      const tables = await base.getTableMetaList();
      let templateTable = tables.find((t: any) => t.name === 'BaseDocEditor_模板');
      let isNewTable = false;

      if (!templateTable) {
        console.log('[TemplateStorage] Template table not found, attempting to create...');
        
        try {
          templateTable = await base.addTable({
            name: 'BaseDocEditor_模板',
            fields: [
              { name: '模板名称', type: FieldType.Text },
              { name: '模板内容', type: FieldType.Text },
              { name: '模板描述', type: FieldType.Text },
              { name: '创建时间', type: FieldType.DateTime },
              { name: '更新时间', type: FieldType.DateTime }
            ]
          });
          isNewTable = true;
          console.log('[TemplateStorage] Template table created successfully');
        } catch (createErr: any) {
          console.error('[TemplateStorage] Failed to create template table:', createErr);
          
          // 权限不足的错误提示
          if (createErr.message?.includes('permission') || createErr.code === 403) {
            setError('需要创建数据表权限。请联系管理员在多维表格中手动创建名为"BaseDocEditor_模板"的数据表，包含以下字段：模板名称（文本）、模板内容（文本）、模板描述（文本）、创建时间（日期）、更新时间（日期）');
          } else {
            setError(`创建模板表失败: ${createErr.message || '未知错误'}`);
          }
          return null;
        }
      }

      const templateTableInstance = await base.getTable(templateTable.id);
      const fields = await templateTableInstance.getFieldMetaList();

      const config: TemplateTableConfig = {
        tableId: templateTable.id,
        fieldIds: {
          name: fields.find((f: any) => f.name === '模板名称')?.id || '',
          content: fields.find((f: any) => f.name === '模板内容')?.id || '',
          description: fields.find((f: any) => f.name === '模板描述')?.id || '',
          createdAt: fields.find((f: any) => f.name === '创建时间')?.id || '',
          updatedAt: fields.find((f: any) => f.name === '更新时间')?.id || ''
        }
      };

      setTemplateTableConfig(config);
      console.log('[TemplateStorage] initTemplateTable success', config);
      return config;
    } catch (err: any) {
      console.error('[TemplateStorage] 初始化模板表失败:', err);
      setError(err.message || '初始化模板表失败');
      return null;
    }
  }, []);

  return {
    templates,
    loading,
    error,
    templateTableConfig,
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    copyTemplate,
    exportTemplate,
    importTemplate,
    initTemplateTable
  };
}

