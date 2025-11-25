/**
 * PDF表格元素组件
 * 使用View模拟表格布局
 */

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { IRecord, IFieldMeta, FieldType } from '@lark-base-open/js-sdk';
import { TemplateElement, TableColumn, TableRow, TableCell } from '../../types/template';
import { pdfStyles } from './pdfStyles';
import { formatFieldValue } from '../../utils/fieldFormatter';
import { parseRichText } from '../../utils/pdfDataMapper';
import { PdfRichText } from './PdfRichText';

interface PdfTableElementProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
  loopRecords?: IRecord[]; // 用于循环表格
  loopFields?: IFieldMeta[]; // 循环记录的字段列表
}

export const PdfTableElement: React.FC<PdfTableElementProps> = ({ 
  element, 
  record, 
  fields,
  loopRecords,
  loopFields
}) => {
  const config = element.config as any;
  const columns = config.columns || [];
  const rows = config.rows || [];
  const dataSource = config.dataSource || 'dynamic';
  const showHeader = config.showHeader !== false;
  
  if (columns.length === 0) {
    return (
      <Text style={pdfStyles.emptyValue}>表格未配置列</Text>
    );
  }
  
  // 计算列宽（均分）
  const columnWidth = `${100 / columns.length}%`;
  
  // 渲染单元格内容
  const renderCellContent = (
    cell: TableCell, 
    currentRecord: IRecord, 
    currentFields: IFieldMeta[]
  ) => {
    if (cell.type === 'text') {
      return (
        <Text>
          {cell.labelPrefix || ''}{cell.content || ''}
        </Text>
      );
    }
    
    if (cell.type === 'field' && cell.fieldId) {
      const field = currentFields.find(f => f.id === cell.fieldId);
      if (!field) {
        return <Text style={pdfStyles.emptyValue}>字段未找到</Text>;
      }
      
      const value = currentRecord.fields[cell.fieldId];
      const displayValue = formatFieldValue(value, field.type);
      
      // 空值处理
      if (!displayValue || displayValue.trim() === '') {
        return <Text style={pdfStyles.emptyValue}>空</Text>;
      }
      
      // 解析富文本
      const segments = parseRichText(value, field.type);
      
      return (
        <>
          {cell.labelPrefix && <Text>{cell.labelPrefix}</Text>}
          <PdfRichText segments={segments} />
        </>
      );
    }
    
    return <Text style={pdfStyles.emptyValue}>-</Text>;
  };
  
  // 根据数据源类型渲染表格
  if (dataSource === 'static' && rows.length > 0) {
    // 静态表格：使用配置的行
    return (
      <View style={[pdfStyles.table, pdfStyles.tableBorder]}>
        {/* 表头 */}
        {showHeader && (
          <View style={pdfStyles.tableHeaderRow}>
            {columns.map((column: TableColumn, index: number) => (
              <View 
                key={column.id} 
                style={[
                  pdfStyles.tableHeaderCell,
                  { width: columnWidth },
                  ...(index === 0 ? [pdfStyles.tableFirstCell] : []),
                  ...(index === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                ]}
              >
                <Text>{column.label}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* 数据行 */}
        {rows.map((row: TableRow, rowIndex: number) => (
          <View key={rowIndex} style={pdfStyles.tableRow}>
            {columns.map((column: TableColumn, colIndex: number) => {
              const cell = row.cells.find((c: TableCell) => c.columnId === column.id);
              return (
                <View 
                  key={column.id}
                  style={[
                    pdfStyles.tableCell,
                    { width: columnWidth },
                    ...(colIndex === 0 ? [pdfStyles.tableFirstCell] : []),
                    ...(colIndex === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                  ]}
                >
                  {cell ? renderCellContent(cell, record, fields) : <Text>-</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }
  
  if (dataSource === 'loop' && loopRecords && loopRecords.length > 0 && loopFields) {
    // 循环表格：使用循环记录
    return (
      <View style={[pdfStyles.table, pdfStyles.tableBorder]}>
        {/* 表头 */}
        {showHeader && (
          <View style={pdfStyles.tableHeaderRow}>
            {columns.map((column: TableColumn, index: number) => (
              <View 
                key={column.id} 
                style={[
                  pdfStyles.tableHeaderCell,
                  { width: columnWidth },
                  ...(index === 0 ? [pdfStyles.tableFirstCell] : []),
                  ...(index === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                ]}
              >
                <Text>{column.label}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* 循环记录行 */}
        {loopRecords.map((loopRecord: IRecord, rowIndex: number) => (
          <View key={loopRecord.recordId} style={pdfStyles.tableRow}>
            {columns.map((column: TableColumn, colIndex: number) => {
              const fieldId = column.fieldId;
              if (!fieldId) {
                return (
                  <View 
                    key={column.id}
                    style={[
                      pdfStyles.tableCell,
                      { width: columnWidth },
                      ...(colIndex === 0 ? [pdfStyles.tableFirstCell] : []),
                      ...(colIndex === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                    ]}
                  >
                    <Text>-</Text>
                  </View>
                );
              }
              
              const field = loopFields.find(f => f.id === fieldId);
              if (!field) {
                return (
                  <View 
                    key={column.id}
                    style={[
                      pdfStyles.tableCell,
                      { width: columnWidth },
                      ...(colIndex === 0 ? [pdfStyles.tableFirstCell] : []),
                      ...(colIndex === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                    ]}
                  >
                    <Text style={pdfStyles.emptyValue}>字段未找到</Text>
                  </View>
                );
              }
              
              const value = loopRecord.fields[fieldId];
              const displayValue = formatFieldValue(value, field.type);
              
              // 处理复选框字段
              if (field.type === FieldType.Checkbox) {
                const isChecked = value === true || value === 1;
                return (
                  <View 
                    key={column.id}
                    style={[
                      pdfStyles.tableCell,
                      { width: columnWidth },
                      ...(colIndex === 0 ? [pdfStyles.tableFirstCell] : []),
                      ...(colIndex === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                    ]}
                  >
                    <Text>{isChecked ? '☑' : '☐'}</Text>
                  </View>
                );
              }
              
              // 空值处理
              if (!displayValue || displayValue.trim() === '') {
                return (
                  <View 
                    key={column.id}
                    style={[
                      pdfStyles.tableCell,
                      { width: columnWidth },
                      ...(colIndex === 0 ? [pdfStyles.tableFirstCell] : []),
                      ...(colIndex === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                    ]}
                  >
                    <Text style={pdfStyles.emptyValue}>空</Text>
                  </View>
                );
              }
              
              // 解析富文本
              const segments = parseRichText(value, field.type);
              
              return (
                <View 
                  key={column.id}
                  style={[
                    pdfStyles.tableCell,
                    { width: columnWidth },
                    ...(colIndex === 0 ? [pdfStyles.tableFirstCell] : []),
                    ...(colIndex === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
                  ]}
                >
                  <PdfRichText segments={segments} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }
  
  // 默认：空表格
  return (
    <View style={[pdfStyles.table, pdfStyles.tableBorder]}>
      {showHeader && (
        <View style={pdfStyles.tableHeaderRow}>
          {columns.map((column: TableColumn, index: number) => (
            <View 
              key={column.id} 
              style={[
                pdfStyles.tableHeaderCell,
                { width: columnWidth },
                ...(index === 0 ? [pdfStyles.tableFirstCell] : []),
                ...(index === columns.length - 1 ? [pdfStyles.tableLastCell] : [])
              ]}
            >
              <Text>{column.label}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={pdfStyles.tableRow}>
        <View style={pdfStyles.tableCell}>
          <Text style={pdfStyles.emptyValue}>暂无数据</Text>
        </View>
      </View>
    </View>
  );
};

