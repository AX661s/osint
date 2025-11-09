import React from 'react';

/**
 * 玻璃态卡片组件
 * 提供现代化的毛玻璃效果背景
 */
export const GlassCard = ({ 
  children, 
  className = "", 
  hover = true,
  style = {},
  ...props 
}) => {
  // 强制深色主题样式
  const darkStyle = {
    backgroundColor: 'hsl(222 47% 4%)', // Deep dark blue-black
    borderColor: 'hsl(222 30% 18%)',    // Subtle border
    color: 'hsl(180 5% 95%)',           // Soft white text
    ...style
  };

  return (
    <div
      className={`
        relative rounded-2xl border shadow-xl
        ${hover ? 'transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5' : ''}
        ${className}
      `}
      style={darkStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
