import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LayerRoot } from '../src/Layer';
import { LayerStore } from '../src/store';

describe('LayerRoot', () => {
  beforeEach(() => {
    // 每次测试前清空 LayerStore 和 DOM
    LayerStore.layers = [];
    LayerStore.listeners.clear();

    // 清理之前可能存在的 layer-root 元素
    const existingRoot = document.getElementById('layer-root');
    if (existingRoot) {
      existingRoot.remove();
    }
  });

  afterEach(() => {
    // 清理测试后的 DOM
    const root = document.getElementById('layer-root');
    if (root) {
      root.remove();
    }
  });

  describe('DOM 结构', () => {
    it('应该创建 layer-root 元素', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root).toBeInTheDocument();
    });

    it('应该使用自定义 root id', () => {
      render(<LayerRoot root="custom-root" />);

      const customRoot = document.getElementById('custom-root');
      expect(customRoot).toBeInTheDocument();
    });

    it('layer-root 应该是 div 元素', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.tagName).toBe('DIV');
    });

    it('layer-root 应该被添加到 document.body', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.parentElement).toBe(document.body);
    });

    it('如果 root 元素已存在，应该复用它', () => {
      // 手动创建一个 root 元素
      const existingRoot = document.createElement('div');
      existingRoot.setAttribute('id', 'layer-root');
      existingRoot.setAttribute('data-test', 'existing');
      document.body.appendChild(existingRoot);

      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.getAttribute('data-test')).toBe('existing');

      // 清理
      existingRoot.remove();
    });
  });

  describe('渲染 layers', () => {
    it('没有 layers 时应该渲染空内容', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.children).toHaveLength(0);
    });

    it('应该渲染单个 layer', () => {
      const TestComponent: React.FC = () => (
        <div data-testid="test-layer">Test Layer</div>
      );

      LayerStore.add({
        key: 'test-layer',
        component: TestComponent
      });

      render(<LayerRoot />);

      expect(screen.getByTestId('test-layer')).toBeInTheDocument();
      expect(screen.getByTestId('test-layer')).toHaveTextContent('Test Layer');
    });

    it('应该渲染多个 layers', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;
      const Layer3: React.FC = () => <div data-testid="layer-3">Layer 3</div>;

      LayerStore.add({ key: 'layer-1', component: Layer1 });
      LayerStore.add({ key: 'layer-2', component: Layer2 });
      LayerStore.add({ key: 'layer-3', component: Layer3 });

      render(<LayerRoot />);

      expect(screen.getByTestId('layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();
      expect(screen.getByTestId('layer-3')).toBeInTheDocument();
    });

    it('应该按 layers 顺序渲染', () => {
      const Layer1: React.FC = () => <div data-testid="layer">First</div>;
      const Layer2: React.FC = () => <div data-testid="layer">Second</div>;
      const Layer3: React.FC = () => <div data-testid="layer">Third</div>;

      LayerStore.add({ key: 'layer-1', component: Layer1 });
      LayerStore.add({ key: 'layer-2', component: Layer2 });
      LayerStore.add({ key: 'layer-3', component: Layer3 });

      render(<LayerRoot />);

      const layers = screen.getAllByTestId('layer');
      expect(layers).toHaveLength(3);
      expect(layers[0]).toHaveTextContent('First');
      expect(layers[1]).toHaveTextContent('Second');
      expect(layers[2]).toHaveTextContent('Third');
    });

    it('每个 layer 应该有唯一的 key', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;

      LayerStore.add({ key: 'unique-1', component: Layer1 });
      LayerStore.add({ key: 'unique-2', component: Layer2 });

      render(<LayerRoot />);

      // 验证两个 layer 都被渲染了
      expect(screen.getByTestId('layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();

      // 验证 layers 数组中的 key 是唯一的
      expect(LayerStore.layers[0].key).toBe('unique-1');
      expect(LayerStore.layers[1].key).toBe('unique-2');
      expect(LayerStore.layers[0].key).not.toBe(LayerStore.layers[1].key);
    });
  });

  describe('响应 LayerStore 变化', () => {
    it('添��� layer 后应该自动渲染', () => {
      const { rerender } = render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.children).toHaveLength(0);

      const TestLayer: React.FC = () => <div data-testid="new-layer">New Layer</div>;
      LayerStore.add({ key: 'new', component: TestLayer });
      LayerStore.notify();

      rerender(<LayerRoot />);

      expect(screen.getByTestId('new-layer')).toBeInTheDocument();
    });

    it('删除 layer 后应该自动移除', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;

      LayerStore.add({ key: 'layer-1', component: Layer1 });
      LayerStore.add({ key: 'layer-2', component: Layer2 });

      const { rerender } = render(<LayerRoot />);

      expect(screen.getByTestId('layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();

      LayerStore.destroy('layer-1');
      LayerStore.notify();

      rerender(<LayerRoot />);

      expect(screen.queryByTestId('layer-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();
    });
  });

  describe('Portal 行为', () => {
    it('layers 应该渲染在 layer-root 中而不是组件树中', () => {
      const TestLayer: React.FC = () => <div data-testid="portal-layer">Portal</div>;

      LayerStore.add({ key: 'portal', component: TestLayer });

      const { container } = render(
        <div data-testid="app-container">
          <LayerRoot />
        </div>
      );

      const appContainer = screen.getByTestId('app-container');
      const layerRoot = document.getElementById('layer-root');
      const portalLayer = screen.getByTestId('portal-layer');

      // layer 应该在 layer-root 中
      expect(layerRoot).toContainElement(portalLayer);

      // layer 不应该在 app-container 的直接子元素中
      expect(appContainer.querySelector('[data-testid="portal-layer"]')).toBeNull();
    });

    it('应该支持多个 LayerRoot 实例使用不同的 root', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;

      LayerStore.add({ key: 'layer-1', component: Layer1 });

      const LayerStore2 = { ...LayerStore, layers: [{ key: 'layer-2', component: Layer2 }] };

      render(
        <>
          <LayerRoot root="root-1" />
          <LayerRoot root="root-2" />
        </>
      );

      const root1 = document.getElementById('root-1');
      const root2 = document.getElementById('root-2');

      expect(root1).toBeInTheDocument();
      expect(root2).toBeInTheDocument();

      // 清理
      root2?.remove();
    });
  });

  describe('组件 props 传递', () => {
    it('应该正确传递 props 到 layer 组件', () => {
      interface LayerProps {
        title: string;
        count: number;
      }

      const PropsLayer: React.FC<LayerProps> = ({ title, count }) => (
        <div data-testid="props-layer">
          <h1 data-testid="title">{title}</h1>
          <p data-testid="count">{count}</p>
        </div>
      );

      LayerStore.add({
        key: 'props-test',
        component: (props: LayerProps) => <PropsLayer {...props} title="Test" count={42} />
      });

      render(<LayerRoot />);

      expect(screen.getByTestId('title')).toHaveTextContent('Test');
      expect(screen.getByTestId('count')).toHaveTextContent('42');
    });
  });

  describe('边界情况', () => {
    it('应该处理空的 LayerStore', () => {
      LayerStore.layers = [];

      expect(() => {
        render(<LayerRoot />);
      }).not.toThrow();
    });

    it('应该处理组件返回 null 的情况', () => {
      const NullLayer: React.FC = () => null;

      LayerStore.add({ key: 'null-layer', component: NullLayer });

      expect(() => {
        render(<LayerRoot />);
      }).not.toThrow();
    });

    it('应该处理组件返回 fragment 的情况', () => {
      const FragmentLayer: React.FC = () => (
        <>
          <div data-testid="fragment-1">Fragment 1</div>
          <div data-testid="fragment-2">Fragment 2</div>
        </>
      );

      LayerStore.add({ key: 'fragment', component: FragmentLayer });

      render(<LayerRoot />);

      expect(screen.getByTestId('fragment-1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-2')).toBeInTheDocument();
    });

    it('快速添加和删除 layers', () => {
      const { rerender } = render(<LayerRoot />);

      for (let i = 0; i < 10; i++) {
        const Component: React.FC = () => <div data-testid={`layer-${i}`}>Layer {i}</div>;
        LayerStore.add({ key: `layer-${i}`, component: Component });
      }

      LayerStore.notify();
      rerender(<LayerRoot />);

      expect(LayerStore.layers).toHaveLength(10);

      for (let i = 0; i < 5; i++) {
        LayerStore.destroy(`layer-${i}`);
      }

      LayerStore.notify();
      rerender(<LayerRoot />);

      expect(LayerStore.layers).toHaveLength(5);
    });
  });

  describe('嵌套组件', () => {
    it('应该支持嵌套的复杂组件', () => {
      const NestedLayer: React.FC = () => (
        <div data-testid="nested-layer">
          <header>
            <h1>Title</h1>
          </header>
          <main>
            <section>
              <p data-testid="nested-content">Nested Content</p>
            </section>
          </main>
          <footer>Footer</footer>
        </div>
      );

      LayerStore.add({ key: 'nested', component: NestedLayer });

      render(<LayerRoot />);

      expect(screen.getByTestId('nested-layer')).toBeInTheDocument();
      expect(screen.getByTestId('nested-content')).toHaveTextContent('Nested Content');
    });
  });
});

