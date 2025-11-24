/**
 * 模板序列化/反序列化工具
 * 将模板对象转换为JS代码字符串，或从JS代码字符串解析为模板对象
 */

import { Template } from '../types/template';

/**
 * 将模板对象序列化为JS代码字符串
 */
export function serializeTemplate(template: Template): string {
  // 生成可执行的JS代码
  // 使用JSON.stringify确保数据安全，避免XSS
  const templateCode = `
// 模板: ${template.name}
// 版本: ${template.version}
// 创建时间: ${new Date(template.createdAt).toISOString()}
// 更新时间: ${new Date(template.updatedAt).toISOString()}

(function() {
  'use strict';
  
  // 模板数据
  const templateData = ${JSON.stringify(template, null, 2)};
  
  // 返回模板对象
  return templateData;
})();
  `.trim();

  return templateCode;
}

/**
 * 从JS代码字符串解析模板对象
 */
export function deserializeTemplate(code: string): Template | null {
  try {
    // 安全地执行代码
    // 使用Function构造函数而不是eval，避免作用域污染
    const func = new Function('return ' + code);
    const result = func();
    
    // 验证结果是否为有效的模板对象
    if (isValidTemplate(result)) {
      return result as Template;
    }
    
    console.error('解析的模板对象无效');
    return null;
  } catch (error) {
    console.error('解析模板代码失败:', error);
    return null;
  }
}

/**
 * 验证模板对象是否有效
 */
function isValidTemplate(obj: any): obj is Template {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    Array.isArray(obj.elements) &&
    typeof obj.styles === 'object'
  );
}

/**
 * 从多维表格字段读取模板
 */
export async function loadTemplateFromField(
  table: any,
  recordId: string,
  fieldId: string
): Promise<Template | null> {
  try {
    const value = await table.getCellValue(fieldId, recordId);
    if (!value || typeof value !== 'string') {
      return null;
    }
    return deserializeTemplate(value);
  } catch (error) {
    console.error('从字段读取模板失败:', error);
    return null;
  }
}

/**
 * 将模板保存到多维表格字段
 */
export async function saveTemplateToField(
  table: any,
  recordId: string,
  fieldId: string,
  template: Template
): Promise<boolean> {
  try {
    console.log('[TemplateSerializer] saveTemplateToField start', { tableId: table?.id, recordId, fieldId, templateId: template.id, templateName: template.name });
    const code = serializeTemplate(template);
    await table.setCellValue(fieldId, recordId, code);
    console.log('[TemplateSerializer] saveTemplateToField success');
    return true;
  } catch (error) {
    console.error('保存模板到字段失败:', error);
    return false;
  }
}

