import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LayerRoot } from '../src/Layer';
import { LayerStore } from '../src/store';

describe('LayerRoot', () => {
  beforeEach(() => {
    // Clear LayerStore and DOM before each test
    LayerStore.layers = [];
    LayerStore.listeners.clear();

    // Clean up any existing layer-root element
    const existingRoot = document.getElementById('layer-root');
    if (existingRoot) {
      existingRoot.remove();
    }
  });

  afterEach(() => {
    // Clean up DOM after test
    const root = document.getElementById('layer-root');
    if (root) {
      root.remove();
    }
  });

  describe('DOM structure', () => {
    it('should create layer-root element', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root).toBeInTheDocument();
    });

    it('should use custom root id', () => {
      render(<LayerRoot root="custom-root" />);

      const customRoot = document.getElementById('custom-root');
      expect(customRoot).toBeInTheDocument();
    });

    it('layer-root should be a div element', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.tagName).toBe('DIV');
    });

    it('layer-root should be added to document.body', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.parentElement).toBe(document.body);
    });

    it('should reuse existing root element if it exists', () => {
      // Manually create a root element
      const existingRoot = document.createElement('div');
      existingRoot.setAttribute('id', 'layer-root');
      existingRoot.setAttribute('data-test', 'existing');
      document.body.appendChild(existingRoot);

      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.getAttribute('data-test')).toBe('existing');

      // Cleanup
      existingRoot.remove();
    });
  });

  describe('Rendering layers', () => {
    it('should render empty content when there are no layers', () => {
      render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.children).toHaveLength(0);
    });

    it('should render a single layer', () => {
      const TestComponent: React.FC = () => (
        <div data-testid="test-layer">Test Layer</div>
      );

      LayerStore.add({
        key: 'test-layer',
        component: TestComponent,
        destroy: () => {}
      });

      render(<LayerRoot />);

      expect(screen.getByTestId('test-layer')).toBeInTheDocument();
      expect(screen.getByTestId('test-layer')).toHaveTextContent('Test Layer');
    });

    it('should render multiple layers', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;
      const Layer3: React.FC = () => <div data-testid="layer-3">Layer 3</div>;

      LayerStore.add({ key: 'layer-1', component: Layer1, destroy: () => {} });
      LayerStore.add({ key: 'layer-2', component: Layer2, destroy: () => {} });
      LayerStore.add({ key: 'layer-3', component: Layer3, destroy: () => {} });

      render(<LayerRoot />);

      expect(screen.getByTestId('layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();
      expect(screen.getByTestId('layer-3')).toBeInTheDocument();
    });

    it('should render in layers order', () => {
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

    it('each layer should have unique key', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;

      LayerStore.add({ key: 'unique-1', component: Layer1, destroy: () => {} });
      LayerStore.add({ key: 'unique-2', component: Layer2, destroy: () => {} });

      render(<LayerRoot />);

      // Verify both layers are rendered
      expect(screen.getByTestId('layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();

      // Verify keys in layers array are unique
      expect(LayerStore.layers[0].key).toBe('unique-1');
      expect(LayerStore.layers[1].key).toBe('unique-2');
      expect(LayerStore.layers[0].key).not.toBe(LayerStore.layers[1].key);
    });
  });

  describe('Responding to LayerStore changes', () => {
    it('should auto-render after adding layer', () => {
      const { rerender } = render(<LayerRoot />);

      const root = document.getElementById('layer-root');
      expect(root?.children).toHaveLength(0);

      const TestLayer: React.FC = () => <div data-testid="new-layer">New Layer</div>;
      LayerStore.add({ key: 'new', component: TestLayer, destroy: () => {} });
      LayerStore.notify();

      rerender(<LayerRoot />);

      expect(screen.getByTestId('new-layer')).toBeInTheDocument();
    });

    it('should auto-remove after deleting layer', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;

      LayerStore.add({ key: 'layer-1', component: Layer1, destroy: () => {} });
      LayerStore.add({ key: 'layer-2', component: Layer2, destroy: () => {} });

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

  describe('Portal behavior', () => {
    it('layers should render in layer-root instead of component tree', () => {
      const TestLayer: React.FC = () => <div data-testid="portal-layer">Portal</div>;

      LayerStore.add({ key: 'portal', component: TestLayer, destroy: () => {} });

      const { container } = render(
        <div data-testid="app-container">
          <LayerRoot />
        </div>
      );

      const appContainer = screen.getByTestId('app-container');
      const layerRoot = document.getElementById('layer-root');
      const portalLayer = screen.getByTestId('portal-layer');

      // layer should be in layer-root
      expect(layerRoot).toContainElement(portalLayer);

      // layer should not be in app-container's direct children
      expect(appContainer.querySelector('[data-testid="portal-layer"]')).toBeNull();
    });

    it('should support multiple LayerRoot instances with different roots', () => {
      const Layer1: React.FC = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: React.FC = () => <div data-testid="layer-2">Layer 2</div>;

      LayerStore.add({ key: 'layer-1', component: Layer1, destroy: () => {} });

      const LayerStore2 = { ...LayerStore, layers: [{ key: 'layer-2', component: Layer2, destroy: () => {} }] };

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

      // Cleanup
      root2?.remove();
    });
  });

  describe('Component props passing', () => {
    it('should correctly pass props to layer component', () => {
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
        component: (props: LayerProps) => <PropsLayer {...props} title="Test" count={42} />,
        destroy: () => {}
      });

      render(<LayerRoot />);

      expect(screen.getByTestId('title')).toHaveTextContent('Test');
      expect(screen.getByTestId('count')).toHaveTextContent('42');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty LayerStore', () => {
      LayerStore.layers = [];

      expect(() => {
        render(<LayerRoot />);
      }).not.toThrow();
    });

    it('should handle component returning null', () => {
      const NullLayer: React.FC = () => null;

      LayerStore.add({ key: 'null-layer', component: NullLayer, destroy: () => {} });

      expect(() => {
        render(<LayerRoot />);
      }).not.toThrow();
    });

    it('should handle component returning fragment', () => {
      const FragmentLayer: React.FC = () => (
        <>
          <div data-testid="fragment-1">Fragment 1</div>
          <div data-testid="fragment-2">Fragment 2</div>
        </>
      );

      LayerStore.add({ key: 'fragment', component: FragmentLayer, destroy: () => {} });

      render(<LayerRoot />);

      expect(screen.getByTestId('fragment-1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-2')).toBeInTheDocument();
    });

    it('rapidly adding and removing layers', () => {
      const { rerender } = render(<LayerRoot />);

      for (let i = 0; i < 10; i++) {
        const Component: React.FC = () => <div data-testid={`layer-${i}`}>Layer {i}</div>;
        LayerStore.add({ key: `layer-${i}`, component: Component, destroy: () => {} });
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

  describe('Nested components', () => {
    it('should support nested complex components', () => {
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

      LayerStore.add({ key: 'nested', component: NestedLayer, destroy: () => {} });

      render(<LayerRoot />);

      expect(screen.getByTestId('nested-layer')).toBeInTheDocument();
      expect(screen.getByTestId('nested-content')).toHaveTextContent('Nested Content');
    });
  });
});

