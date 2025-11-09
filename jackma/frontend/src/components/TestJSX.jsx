// 临时的JSX验证文件，用来测试结构
import React from 'react';

const TestComponent = () => {
  return (
    <div className="test1">
      <div className="test2">
        <div className="test3">
          {/* 数据完整度指示器 */}
          <div className="inline-flex flex-col items-end gap-3">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12">
                  <span>Icon</span>
                </div>
                <div className="text-left">
                  <div className="text-xs">数据完整度</div>
                  <div className="text-2xl">95%</div>
                </div>
              </div>
            </div>
            
            {/* 验证状态 */}
            <div className="px-4 py-2">
              <span className="text-sm">
                已验证
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;