import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { LayerStore, useLayerStore, Layer } from '../src/store';

describe('LayerStore', () => {
  beforeEach(() => {
    // 每次测试前重置 LayerStore 状态
    LayerStore.layers = [];
    LayerStore.listeners.clear();
  });

  describe('初始状态', () => {
    it('应该初始化为空数组', () => {
      expect(LayerStore.layers).toEqual([]);
      expect(LayerStore.layers).toHaveLength(0);
    });

    it('应该有一个空的 listeners Set', () => {
      expect(LayerStore.listeners).toBeInstanceOf(Set);
      expect(LayerStore.listeners.size).toBe(0);
    });

    it('应该包含 add、destroy 和 notify 方法', () => {
      expect(typeof LayerStore.add).toBe('function');
      expect(typeof LayerStore.destroy).toBe('function');
      expect(typeof LayerStore.notify).toBe('function');
    });
  });

  describe('add 方法', () => {
    it('应该添加 layer 到 layers 数组', () => {
      const layer: Layer = {
        key: 'test-layer',
        component: () => React.createElement('div'),
        destroy: () => {}
      };

      LayerStore.add(layer);

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0]).toBe(layer);
    });

    it('应该按添加顺序保存 layers', () => {
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

    it('应该允许添加相同 key 的 layer 多次', () => {
      const layer: Layer = { key: 'duplicate', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer);
      LayerStore.add(layer);

      expect(LayerStore.layers).toHaveLength(2);
    });

    it('添加 layer 后应该调用 notify', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      const layer: Layer = { key: 'test', component: () => React.createElement('div'), destroy: () => {} };
      LayerStore.add(layer);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroy 方法', () => {
    it('应该根据 key 移除 layer', () => {
      const layer1: Layer = { key: 'layer-1', component: () => React.createElement('div'), destroy: () => {} };
      const layer2: Layer = { key: 'layer-2', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer1);
      LayerStore.add(layer2);

      LayerStore.destroy('layer-1');

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');
    });

    it('应该移除所有匹配 key 的 layers', () => {
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

    it('删除不存在的 key 不应该报错', () => {
      expect(() => {
        LayerStore.destroy('non-existent');
      }).not.toThrow();

      expect(LayerStore.layers).toHaveLength(0);
    });

    it('销毁 layer 后应该调用 notify', () => {
      const listener = vi.fn();
      const layer: Layer = { key: 'test', component: () => React.createElement('div'), destroy: () => {} };

      LayerStore.add(layer);
      listener.mockClear();

      LayerStore.listeners.add(listener);
      LayerStore.destroy('test');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该保留其他 layers 的顺序', () => {
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

  describe('notify 方法', () => {
    it('应该调用所有注册的 listeners', () => {
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

    it('没有 listeners 时调用 notify 不应该报错', () => {
      expect(() => {
        LayerStore.notify();
      }).not.toThrow();
    });

    it('多次调用 notify 应该多次触发 listeners', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      LayerStore.notify();
      LayerStore.notify();
      LayerStore.notify();

      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe('listeners 管理', () => {
    it('应该能添加 listener', () => {
      const listener = vi.fn();

      LayerStore.listeners.add(listener);

      expect(LayerStore.listeners.size).toBe(1);
      expect(LayerStore.listeners.has(listener)).toBe(true);
    });

    it('应该能移除 listener', () => {
      const listener = vi.fn();

      LayerStore.listeners.add(listener);
      expect(LayerStore.listeners.size).toBe(1);

      LayerStore.listeners.delete(listener);
      expect(LayerStore.listeners.size).toBe(0);
      expect(LayerStore.listeners.has(listener)).toBe(false);
    });

    it('移除 listener 后不应该再收到通知', () => {
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

  describe('集成测试', () => {
    it('完整的添加和删除流程', () => {
      const listener = vi.fn();
      LayerStore.listeners.add(listener);

      const layer1: Layer = { key: 'layer-1', component: () => React.createElement('div'), destroy: () => {} };
      const layer2: Layer = { key: 'layer-2', component: () => React.createElement('div'), destroy: () => {} };

      // 添加第一个 layer
      LayerStore.add(layer1);
      expect(LayerStore.layers).toHaveLength(1);
      expect(listener).toHaveBeenCalledTimes(1);

      // 添加第二个 layer
      LayerStore.add(layer2);
      expect(LayerStore.layers).toHaveLength(2);
      expect(listener).toHaveBeenCalledTimes(2);

      // 删除第一个 layer
      LayerStore.destroy('layer-1');
      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');
      expect(listener).toHaveBeenCalledTimes(3);

      // 删除第二个 layer
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

  it('应该返回 layers 数组', () => {
    const { result } = renderHook(() => useLayerStore());

    expect(result.current).toEqual(LayerStore.layers);
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('应该响应 LayerStore 的变化', () => {
    const { result } = renderHook(() => useLayerStore());

    expect(result.current).toHaveLength(0);

    act(() => {
      const layer: Layer = { key: 'test', component: () => React.createElement('div'), destroy: () => {} };
      LayerStore.add(layer);
    });

    expect(result.current).toHaveLength(1);
  });

  it('应该在组件卸载时清理 listener', () => {
    const { unmount } = renderHook(() => useLayerStore());

    const initialListenerCount = LayerStore.listeners.size;
    expect(initialListenerCount).toBe(1);

    unmount();

    expect(LayerStore.listeners.size).toBe(0);
  });

  it('多个组件可以同时订阅 LayerStore', () => {
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

  it('卸载一个组件不应该影响其他订阅者', () => {
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

  it('应该实时反映 layers 的添加', () => {
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

  it('应该实时反映 layers 的删除', () => {
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

