/**
 * PDF数据预加载工具
 * 在生成PDF前预加载所有异步数据（循环区域）
 */

import { IRecord } from '@lark-base-open/js-sdk';
import { Template } from '../types/template';
import { getLoopRecords } from './pdfDataMapper';
import { LoopDataCache } from '../components/PdfExport/PdfDocument';

/**
 * 预加载模板中所有循环区域的数据
 */
export async function preloadLoopData(
  template: Template,
  record: IRecord,
  table: any
): Promise<Map<string, LoopDataCache>> {
  const cache = new Map<string, LoopDataCache>();
  
  console.log('[pdfLoader] 开始预加载循环数据...');
  
  for (const element of template.elements) {
    if (element.type === 'loop') {
      const config = element.config as any;
      const fieldId = config.fieldId;
      const filter = config.filter;
      
      if (fieldId) {
        try {
          console.log(`[pdfLoader] 加载循环区域 ${element.id}, fieldId: ${fieldId}`);
          const loopData = await getLoopRecords(table, record, fieldId, filter);
          cache.set(element.id, loopData);
          console.log(`[pdfLoader] 循环区域 ${element.id} 加载成功，记录数: ${loopData.records.length}`);
        } catch (error) {
          console.error(`[pdfLoader] 加载循环区域 ${element.id} 失败:`, error);
          cache.set(element.id, { records: [], fields: [], linkedTable: null });
        }
      } else {
        console.warn(`[pdfLoader] 循环区域 ${element.id} 未配置 fieldId`);
        cache.set(element.id, { records: [], fields: [], linkedTable: null });
      }
    }
  }
  
  console.log(`[pdfLoader] 预加载完成，共 ${cache.size} 个循环区域`);
  return cache;
}

