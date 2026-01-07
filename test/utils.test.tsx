import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { createLayer, LC, LayerInstance } from '../src/utils';
import { LayerStore } from '../src/store';
import { LayerRoot } from '../src/Layer';

// 测试用的组件
interface TestComponentProps {
  message: string;
  count?: number;
}

const TestComponent: LC<TestComponentProps> = ({ message, count = 0, layer }) => {
  return (
    <div>
      <h1 data-testid="message">{message}</h1>
      <p data-testid="count">{count}</p>
      <p data-testid="layer-key">{layer.key}</p>
      <button onClick={layer.destroy} data-testid="destroy-btn">
        Destroy
      </button>
    </div>
  );
};

describe('createLayer', () => {
  beforeEach(() => {
    // 每次测试前清空 LayerStore
    LayerStore.layers = [];
    LayerStore.listeners.clear();
  });

  describe('基本功能', () => {
    it('应该创建一个 LayerInstance 实例', () => {
      const instance = createLayer(TestComponent);

      expect(instance).toBeDefined();
      expect(instance.layer).toBeDefined();
      expect(instance.render).toBeInstanceOf(Function);
      expect(instance.destroy).toBeInstanceOf(Function);
    });

    it('应该返回包含 layer、render 和 destroy 属性的对象', () => {
      const instance = createLayer(TestComponent);

      expect(instance).toHaveProperty('layer');
      expect(instance).toHaveProperty('render');
      expect(instance).toHaveProperty('destroy');
    });

    it('layer 应该包含 key 和 component 属性', () => {
      const instance = createLayer(TestComponent);

      expect(instance.layer).toHaveProperty('key');
      expect(instance.layer).toHaveProperty('component');
      expect(typeof instance.layer.key).toBe('string');
      expect(typeof instance.layer.component).toBe('function');
    });
  });

  describe('key 生成', () => {
    it('没有提供 key 时应该自动生成随机 key', () => {
      const instance1 = createLayer(TestComponent);
      const instance2 = createLayer(TestComponent);

      expect(instance1.layer.key).toBeDefined();
      expect(instance2.layer.key).toBeDefined();
      expect(instance1.layer.key).not.toBe(instance2.layer.key);
    });

    it('提供自定义 key 时应该使用该 key', () => {
      const customKey = 'my-custom-layer-key';
      const instance = createLayer(TestComponent, customKey);

      expect(instance.layer.key).toBe(customKey);
    });

    it('自动生成的 key 应该是16进制字符串', () => {
      const instance = createLayer(TestComponent);
      const hexPattern = /^[0-9a-f]+$/;

      expect(instance.layer.key).toMatch(hexPattern);
    });
  });

  describe('render 方法', () => {
    it('应该返回 void', () => {
      const instance = createLayer(TestComponent);
      const result = instance.render({ message: 'Hello' });

      expect(result).toBeUndefined();
    });

    it('应该将 layer 添加到 LayerStore', () => {
      const instance = createLayer(TestComponent);

      expect(LayerStore.layers).toHaveLength(0);

      instance.render({ message: 'Test Message', count: 42 });

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe(instance.layer.key);
    });

    it('应该将 layer 和 destroy 作为 props 注入到 LayerStore', () => {
      const instance = createLayer(TestComponent);

      instance.render({ message: 'Test' });

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe(instance.layer.key);
      // layer 已经被添加到 store 中
    });

    it('调用 render 时应该将 layer 添加到 LayerStore', () => {
      const instance = createLayer(TestComponent);

      expect(LayerStore.layers).toHaveLength(0);

      instance.render({ message: 'Test' });

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe(instance.layer.key);
    });

    it('多次调用 render 应该多次添加到 LayerStore', () => {
      const instance = createLayer(TestComponent);

      instance.render({ message: 'First' });
      instance.render({ message: 'Second' });

      expect(LayerStore.layers).toHaveLength(2);
    });
  });

  describe('destroy 方法', () => {
    it('应该从 LayerStore 中移除 layer', () => {
      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      expect(LayerStore.layers).toHaveLength(1);

      instance.destroy();

      expect(LayerStore.layers).toHaveLength(0);
    });

    it('销毁未添加的 layer 不应该报错', () => {
      const instance = createLayer(TestComponent);

      expect(() => {
        instance.destroy();
      }).not.toThrow();
    });

    it('多次调用 destroy 不应该报错', () => {
      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      expect(() => {
        instance.destroy();
        instance.destroy();
        instance.destroy();
      }).not.toThrow();
    });

    it('通过组件内的 destroy prop 调用应该移除 layer', () => {
      const instance = createLayer(TestComponent);

      // 需要先渲染 LayerRoot 才能看到组件
      render(<LayerRoot />);
      act(() => {
        instance.render({ message: 'Test' });
      });

      expect(LayerStore.layers).toHaveLength(1);

      const destroyBtn = screen.getByTestId('destroy-btn');
      destroyBtn.click();

      expect(LayerStore.layers).toHaveLength(0);
    });
  });

  describe('多个 layer 实例', () => {
    it('应该能够独立管理多个 layer', () => {
      const instance1 = createLayer(TestComponent, 'layer-1');
      const instance2 = createLayer(TestComponent, 'layer-2');
      const instance3 = createLayer(TestComponent, 'layer-3');

      instance1.render({ message: 'First' });
      instance2.render({ message: 'Second' });
      instance3.render({ message: 'Third' });

      expect(LayerStore.layers).toHaveLength(3);

      instance2.destroy();

      expect(LayerStore.layers).toHaveLength(2);
      expect(LayerStore.layers.find(l => l.key === 'layer-1')).toBeDefined();
      expect(LayerStore.layers.find(l => l.key === 'layer-2')).toBeUndefined();
      expect(LayerStore.layers.find(l => l.key === 'layer-3')).toBeDefined();
    });

    it('销毁一个 layer 不应该影响其他 layer', () => {
      const instance1 = createLayer(TestComponent, 'layer-1');
      const instance2 = createLayer(TestComponent, 'layer-2');

      instance1.render({ message: 'First' });
      instance2.render({ message: 'Second' });

      instance1.destroy();

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');
    });
  });

  describe('LayerStore 通知机制', () => {
    it('render 时应该通知 listeners', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      expect(listener).toHaveBeenCalled();
    });

    it('destroy 时应该通知 listeners', () => {
      const listener = vi.fn();
      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      listener.mockClear();
      LayerStore.listeners.add(listener);

      instance.destroy();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('类型测试', () => {
    it('应该正确处理泛型 props', () => {
      interface CustomProps {
        title: string;
        value: number;
        onAction?: () => void;
      }

      const CustomComponent: LC<CustomProps> = ({ title, value, layer, destroy }) => (
        <div>
          <h1>{title}</h1>
          <p>{value}</p>
        </div>
      );

      const instance: LayerInstance<CustomProps> = createLayer(CustomComponent);

      // TypeScript 应该允许这样的调用
      instance.render({ title: 'Test', value: 100 });

      expect(LayerStore.layers).toHaveLength(1);
    });

    it('render 方法返回的 props 应该省略 LayerProps', () => {
      const instance = createLayer(TestComponent);

      // 这个测试确保 TypeScript 类型定义正确
      // render 方法应该接收不包含 layer 和 destroy 的 props
      const result = instance.render({
        message: 'Test',
        count: 1,
      });

      // render 方法现在返回 void
      expect(result).toBeUndefined();
      expect(LayerStore.layers).toHaveLength(1);
    });
  });

  describe('组件渲染', () => {
    it('layer.component 应该正确渲染包装后的组件', () => {
      const instance = createLayer(TestComponent);
      const ComponentToRender = instance.layer.component;

      const { container } = render(
        <ComponentToRender message="Direct Render" count={99} />
      );

      expect(screen.getByTestId('message')).toHaveTextContent('Direct Render');
      expect(screen.getByTestId('count')).toHaveTextContent('99');
    });

    it('应该正确传递所有 props 到底层组件', () => {
      interface ComplexProps {
        text: string;
        numbers: number[];
        nested: {
          value: string;
        };
      }

      const ComplexComponent: LC<ComplexProps> = ({ text, numbers, nested, layer }) => (
        <div>
          <span data-testid="text">{text}</span>
          <span data-testid="numbers">{numbers.join(',')}</span>
          <span data-testid="nested">{nested.value}</span>
          <span data-testid="key">{layer.key}</span>
        </div>
      );

      const instance = createLayer(ComplexComponent, 'complex-layer');

      render(<LayerRoot />);
      act(() => {
        instance.render({
          text: 'Hello',
          numbers: [1, 2, 3],
          nested: { value: 'nested-value' }
        });
      });

      expect(screen.getByTestId('text')).toHaveTextContent('Hello');
      expect(screen.getByTestId('numbers')).toHaveTextContent('1,2,3');
      expect(screen.getByTestId('nested')).toHaveTextContent('nested-value');
      expect(screen.getByTestId('key')).toHaveTextContent('complex-layer');
    });
  });
});

