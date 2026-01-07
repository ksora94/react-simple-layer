import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { LayerStore, useLayerStore, Layer } from '../src/store';

describe('LayerStore', () => {
  beforeEach(() => {
    // Reset LayerStore state before each test
    LayerStore.layers = [];
    LayerStore.listeners.clear();
  });

  describe('Initial state', () => {
    it('should initialize as an empty array', () => {
      expect(LayerStore.layers).toEqual([]);
      expect(LayerStore.layers).toHaveLength(0);
    });

    it('should have an empty listeners Set', () => {
      expect(LayerStore.listeners).toBeInstanceOf(Set);
      expect(LayerStore.listeners.size).toBe(0);
    });

    it('should contain add, destroy and notify methods', () => {
      expect(typeof LayerStore.add).toBe('function');
      expect(typeof LayerStore.destroy).toBe('function');
      expect(typeof LayerStore.notify).toBe('function');
    });
  });

  describe('add method', () => {
    it('should add layer to layers array', () => {
      const layer: Layer = {
        key: 'test-layer',
        component: () => React.createElement('div'),
        destroy: () => {}
      };

      LayerStore.add(layer);

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0]).toBe(layer);
    });

    it('should save layers in the order they were added', () => {
      const layer1: Layer = { key: 'layer-1', component: () => React.createElement('div'), destroy: () => {} };
      const layer2: Layer = { key: 'layer-2', component: () => React.createElement('div'), destroy: () => {} };
      const layer3: Layer = { key: 'layer-3', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer1);
      LayerStore.add(layer2);
      LayerStore.add(layer3);

      expect(LayerStore.layers).toHaveLength(3);
      expect(LayerStore.layers[0].key).toBe('layer-1');
      expect(LayerStore.layers[1].key).toBe('layer-2');
      expect(LayerStore.layers[2].key).toBe('layer-3');
    });

    it('should allow adding layers with the same key multiple times', () => {
      const layer: Layer = { key: 'duplicate', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer);
      LayerStore.add(layer);

      expect(LayerStore.layers).toHaveLength(2);
    });

    it('should call notify after adding layer', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      const layer: Layer = { key: 'test', component: () => React.createElement('div'), destroy: () => {} };
      LayerStore.add(layer);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroy method', () => {
    it('should remove layer by key', () => {
      const layer1: Layer = { key: 'layer-1', component: () => React.createElement('div'), destroy: () => {} };
      const layer2: Layer = { key: 'layer-2', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer1);
      LayerStore.add(layer2);

      LayerStore.destroy('layer-1');

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');
    });

    it('should remove all layers with matching key', () => {
      const layer1: Layer = { key: 'same-key', component: () => React.createElement('div'), destroy: () => {} };
      const layer2: Layer = { key: 'same-key', component: () => React.createElement('div'), destroy: () => {} };
      const layer3: Layer = { key: 'different', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer1);
      LayerStore.add(layer2);
      LayerStore.add(layer3);

      LayerStore.destroy('same-key');

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('different');
    });

    it('should not throw error when deleting non-existent key', () => {
      expect(() => {
        LayerStore.destroy('non-existent');
      }).not.toThrow();

      expect(LayerStore.layers).toHaveLength(0);
    });

    it('should call notify after destroying layer', () => {
      const listener = vi.fn();
      const layer: Layer = { key: 'test', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer);
      listener.mockClear();

      LayerStore.listeners.add(listener);
      LayerStore.destroy('test');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should preserve the order of other layers', () => {
      const layer1: Layer = { key: 'layer-1', component: () => React.createElement('div'), destroy: () => {} };
      const layer2: Layer = { key: 'layer-2', component: () => React.createElement('div'), destroy: () => {} };
      const layer3: Layer = { key: 'layer-3', component: () => React.createElement('div'), destroy: () => {} };
      const layer4: Layer = { key: 'layer-4', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer1);
      LayerStore.add(layer2);
      LayerStore.add(layer3);
      LayerStore.add(layer4);

      LayerStore.destroy('layer-2');

      expect(LayerStore.layers).toHaveLength(3);
      expect(LayerStore.layers[0].key).toBe('layer-1');
      expect(LayerStore.layers[1].key).toBe('layer-3');
      expect(LayerStore.layers[2].key).toBe('layer-4');
    });
  });

  describe('notify method', () => {
    it('should call all registered listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      LayerStore.listeners.add(listener1);
      LayerStore.listeners.add(listener2);
      LayerStore.listeners.add(listener3);

      LayerStore.notify();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when calling notify without listeners', () => {
      expect(() => {
        LayerStore.notify();
      }).not.toThrow();
    });

    it('should trigger listeners multiple times when called multiple times', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      LayerStore.notify();
      LayerStore.notify();
      LayerStore.notify();

      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe('listeners management', () => {
    it('should be able to add listener', () => {
      const listener = vi.fn();

      LayerStore.listeners.add(listener);

      expect(LayerStore.listeners.size).toBe(1);
      expect(LayerStore.listeners.has(listener)).toBe(true);
    });

    it('should be able to remove listener', () => {
      const listener = vi.fn();

      LayerStore.listeners.add(listener);
      expect(LayerStore.listeners.size).toBe(1);

      LayerStore.listeners.delete(listener);
      expect(LayerStore.listeners.size).toBe(0);
      expect(LayerStore.listeners.has(listener)).toBe(false);
    });

    it('should not receive notifications after listener is removed', () => {
      const listener = vi.fn();

      LayerStore.listeners.add(listener);
      LayerStore.notify();
      expect(listener).toHaveBeenCalledTimes(1);

      LayerStore.listeners.delete(listener);
      listener.mockClear();

      LayerStore.notify();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    it('complete add and delete flow', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      const layer1: Layer = { key: 'layer-1', component: () => React.createElement('div'), destroy: () => {} };
      const layer2: Layer = { key: 'layer-2', component: () => React.createElement('div'), destroy: () => {} };

      // Add first layer
      LayerStore.add(layer1);
      expect(LayerStore.layers).toHaveLength(1);
      expect(listener).toHaveBeenCalledTimes(1);

      // Add second layer
      LayerStore.add(layer2);
      expect(LayerStore.layers).toHaveLength(2);
      expect(listener).toHaveBeenCalledTimes(2);

      // Delete first layer
      LayerStore.destroy('layer-1');
      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');
      expect(listener).toHaveBeenCalledTimes(3);

      // Delete second layer
      LayerStore.destroy('layer-2');
      expect(LayerStore.layers).toHaveLength(0);
      expect(listener).toHaveBeenCalledTimes(4);
    });
  });
});

describe('useLayerStore', () => {
  beforeEach(() => {
    LayerStore.layers = [];
    LayerStore.listeners.clear();
  });

  it('should return layers array', () => {
    const { result } = renderHook(() => useLayerStore());

    expect(result.current).toEqual(LayerStore.layers);
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('should respond to LayerStore changes', () => {
    const { result } = renderHook(() => useLayerStore());

    expect(result.current).toHaveLength(0);

    act(() => {
      const layer: Layer = { key: 'test', component: () => React.createElement('div'), destroy: () => {} };
      LayerStore.add(layer);
    });

    expect(result.current).toHaveLength(1);
  });

  it('should cleanup listener on component unmount', () => {
    const { unmount } = renderHook(() => useLayerStore());

    const initialListenerCount = LayerStore.listeners.size;
    expect(initialListenerCount).toBe(1);

    unmount();

    expect(LayerStore.listeners.size).toBe(0);
  });

  it('multiple components can subscribe to LayerStore simultaneously', () => {
    const { result: result1 } = renderHook(() => useLayerStore());
    const { result: result2 } = renderHook(() => useLayerStore());
    const { result: result3 } = renderHook(() => useLayerStore());

    expect(LayerStore.listeners.size).toBe(3);

    act(() => {
      const layer: Layer = { key: 'shared', component: () => React.createElement('div'), destroy: () => {} };
      LayerStore.add(layer);
    });

    expect(result1.current).toHaveLength(1);
    expect(result2.current).toHaveLength(1);
    expect(result3.current).toHaveLength(1);
  });

  it('unmounting one component should not affect other subscribers', () => {
    const { unmount: unmount1 } = renderHook(() => useLayerStore());
    const { result: result2 } = renderHook(() => useLayerStore());

    expect(LayerStore.listeners.size).toBe(2);

    unmount1();

    expect(LayerStore.listeners.size).toBe(1);

    act(() => {
      const layer: Layer = { key: 'test', component: () => React.createElement('div'), destroy: () => {} };
      LayerStore.add(layer);
    });

    expect(result2.current).toHaveLength(1);
  });

  it('should reflect layer additions in real-time', () => {
    const { result, rerender } = renderHook(() => useLayerStore());

    expect(result.current).toHaveLength(0);

    act(() => {
      LayerStore.add({ key: '1', component: () => React.createElement('div'), destroy: () => {} });
    });

    expect(result.current).toHaveLength(1);

    act(() => {
      LayerStore.add({ key: '2', component: () => React.createElement('div'), destroy: () => {} });
      LayerStore.add({ key: '3', component: () => React.createElement('div'), destroy: () => {} });
    });

    expect(result.current).toHaveLength(3);
  });

  it('should reflect layer deletions in real-time', () => {
    const { result } = renderHook(() => useLayerStore());

    act(() => {
      LayerStore.add({ key: 'layer-1', component: () => React.createElement('div'), destroy: () => {} });
      LayerStore.add({ key: 'layer-2', component: () => React.createElement('div'), destroy: () => {} });
      LayerStore.add({ key: 'layer-3', component: () => React.createElement('div'), destroy: () => {} });
    });

    expect(result.current).toHaveLength(3);

    act(() => {
      LayerStore.destroy('layer-2');
    });

    expect(result.current).toHaveLength(2);
    expect(result.current.find(l => l.key === 'layer-2')).toBeUndefined();
  });
});

