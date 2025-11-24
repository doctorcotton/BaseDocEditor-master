/**
 * 评论相关类型定义
 */

/**
 * 评论数据
 */
export interface Comment {
  id: string; // 评论表格中的记录ID
  recordId: string; // 被评论的主表格记录ID
  fieldId?: string; // 被评论的字段ID（记录级评论时为空）
  content: string; // 评论内容
  author: string; // 评论者姓名
  authorId: string; // 评论者ID
  timestamp: number; // 评论时间戳
  resolved: boolean; // 是否已解决
  parentId?: string; // 父评论记录ID（回复时）
  attachments?: string[]; // 附件ID列表
  commentType: 'field' | 'record'; // 评论类型
}

/**
 * 评论表格配置
 */
export interface CommentTableConfig {
  tableId: string; // 评论表格ID
  fieldIds: {
    relatedRecord: string; // 关联记录字段ID
    fieldId: string; // 关联字段ID字段ID
    content: string; // 评论内容字段ID
    author: string; // 评论者字段ID
    timestamp: string; // 评论时间字段ID
    parentComment: string; // 父评论字段ID
    resolved: string; // 已解决字段ID
    commentType: string; // 评论类型字段ID
    attachments: string; // 附件字段ID
  };
}

/**
 * 评论统计
 */
export interface CommentStats {
  total: number; // 总评论数
  unresolved: number; // 未解决评论数
  fieldComments: number; // 字段评论数
  recordComments: number; // 记录评论数
}

