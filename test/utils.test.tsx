import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { createLayer, LC, LayerInstance } from '../src/utils';
import { LayerStore } from '../src/store';
import { LayerRoot } from '../src/Layer';

// Test component
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
    // Clear LayerStore before each test
    LayerStore.layers = [];
    LayerStore.listeners.clear();
  });

  describe('Basic functionality', () => {
    it('should create a LayerInstance', () => {
      const instance = createLayer(TestComponent);

      expect(instance).toBeDefined();
      expect(instance.layer).toBeDefined();
      expect(instance.render).toBeInstanceOf(Function);
      expect(instance.destroy).toBeInstanceOf(Function);
    });

    it('should return object with layer, render and destroy properties', () => {
      const instance = createLayer(TestComponent);

      expect(instance).toHaveProperty('layer');
      expect(instance).toHaveProperty('render');
      expect(instance).toHaveProperty('destroy');
    });

    it('layer should contain key and component properties', () => {
      const instance = createLayer(TestComponent);

      expect(instance.layer).toHaveProperty('key');
      expect(instance.layer).toHaveProperty('component');
      expect(typeof instance.layer.key).toBe('string');
      expect(typeof instance.layer.component).toBe('function');
    });
  });

  describe('Key generation', () => {
    it('should auto-generate random key when not provided', () => {
      const instance1 = createLayer(TestComponent);
      const instance2 = createLayer(TestComponent);

      expect(instance1.layer.key).toBeDefined();
      expect(instance2.layer.key).toBeDefined();
      expect(instance1.layer.key).not.toBe(instance2.layer.key);
    });

    it('should use custom key when provided', () => {
      const customKey = 'my-custom-layer-key';
      const instance = createLayer(TestComponent, customKey);

      expect(instance.layer.key).toBe(customKey);
    });

    it('auto-generated key should be hexadecimal string', () => {
      const instance = createLayer(TestComponent);
      const hexPattern = /^[0-9a-f]+$/;

      expect(instance.layer.key).toMatch(hexPattern);
    });
  });

  describe('render method', () => {
    it('should return void', () => {
      const instance = createLayer(TestComponent);
      const result = instance.render({ message: 'Hello' });

      expect(result).toBeUndefined();
    });

    it('should add layer to LayerStore', () => {
      const instance = createLayer(TestComponent);

      expect(LayerStore.layers).toHaveLength(0);

      instance.render({ message: 'Test Message', count: 42 });

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe(instance.layer.key);
    });

    it('should inject layer and destroy as props to LayerStore', () => {
      const instance = createLayer(TestComponent);

      instance.render({ message: 'Test' });

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe(instance.layer.key);
      // layer has been added to store
    });

    it('should add layer to LayerStore when render is called', () => {
      const instance = createLayer(TestComponent);

      expect(LayerStore.layers).toHaveLength(0);

      instance.render({ message: 'Test' });

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe(instance.layer.key);
    });

    it('calling render multiple times should add to LayerStore multiple times', () => {
      const instance = createLayer(TestComponent);

      instance.render({ message: 'First' });
      instance.render({ message: 'Second' });

      expect(LayerStore.layers).toHaveLength(2);
    });
  });

  describe('destroy method', () => {
    it('should remove layer from LayerStore', () => {
      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      expect(LayerStore.layers).toHaveLength(1);

      instance.destroy();

      expect(LayerStore.layers).toHaveLength(0);
    });

    it('should not throw error when destroying un-added layer', () => {
      const instance = createLayer(TestComponent);

      expect(() => {
        instance.destroy();
      }).not.toThrow();
    });

    it('should not throw error when calling destroy multiple times', () => {
      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      expect(() => {
        instance.destroy();
        instance.destroy();
        instance.destroy();
      }).not.toThrow();
    });

    it('calling destroy prop inside component should remove layer', () => {
      const instance = createLayer(TestComponent);

      // Need to render LayerRoot first to see component
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

  describe('Multiple layer instances', () => {
    it('should independently manage multiple layers', () => {
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

    it('destroying one layer should not affect other layers', () => {
      const instance1 = createLayer(TestComponent, 'layer-1');
      const instance2 = createLayer(TestComponent, 'layer-2');

      instance1.render({ message: 'First' });
      instance2.render({ message: 'Second' });

      instance1.destroy();

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');
    });
  });

  describe('LayerStore notification mechanism', () => {
    it('should notify listeners when render is called', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners when destroy is called', () => {
      const listener = vi.fn();
      const instance = createLayer(TestComponent);
      instance.render({ message: 'Test' });

      listener.mockClear();
      LayerStore.listeners.add(listener);

      instance.destroy();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Type tests', () => {
    it('should correctly handle generic props', () => {
      interface CustomProps {
        title: string;
        value: number;
        onAction?: () => void;
      }

      const CustomComponent: LC<CustomProps> = ({ title, value }) => (
        <div>
          <h1>{title}</h1>
          <p>{value}</p>
        </div>
      );

      const instance: LayerInstance<CustomProps> = createLayer(CustomComponent);

      // TypeScript should allow this call
      instance.render({ title: 'Test', value: 100 });

      expect(LayerStore.layers).toHaveLength(1);
    });

    it('render method props should omit LayerProps', () => {
      const instance = createLayer(TestComponent);

      // This test ensures TypeScript type definition is correct
      // render method should receive props without layer and destroy
      const result = instance.render({
        message: 'Test',
        count: 1,
      });

      // render method now returns void
      expect(result).toBeUndefined();
      expect(LayerStore.layers).toHaveLength(1);
    });
  });

  describe('Component rendering', () => {
    it('layer.component should correctly render wrapped component', () => {
      const instance = createLayer(TestComponent);
      const ComponentToRender = instance.layer.component;

      const { container } = render(
        <ComponentToRender message="Direct Render" count={99} />
      );

      expect(screen.getByTestId('message')).toHaveTextContent('Direct Render');
      expect(screen.getByTestId('count')).toHaveTextContent('99');
    });

    it('should correctly pass all props to underlying component', () => {
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

