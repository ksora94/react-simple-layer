import React from 'react'
import {test, expect} from 'vitest';
import renderer from 'react-test-renderer'
import createLayer from '../src/index'

function createTree(component: renderer.ReactTestRenderer) {
  let tree = component.toJSON() as renderer.ReactTestRendererJSON;
  const update = () => {
    const result = component.toJSON();

    expect(result).toBeDefined();
    return tree = result as renderer.ReactTestRendererJSON
  }

  update();

  return {
    tree,
    update
  }
}

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

test('Create layer', async () => {
  const layer = createLayer<{title: string}>(({title}) => {
    return <div>{title}</div>
  })

  expect(layer.instance).toBeNull();
  expect(layer.render).toBeDefined();
  expect(layer.destroy).toBeDefined();
  expect(layer.root).toBeInstanceOf(HTMLElement);

  const component = renderer.create(
      layer.render({
        title: 'react-simple-layer'
      }),
  );

  const {tree} = createTree(component);

  expect(tree).toMatchSnapshot();
})

test('Destroy layer', async () => {
  const layer = createLayer<{title: string}>(({title, layer}) => {
    return <div onClick={layer?.destroy}>{title}</div>
  })
  const component = renderer.create(
      layer.render({
        title: 'react-simple-layer'
      }),
  );

  const {tree} = createTree(component);

  expect(layer.Root!['_internalRoot']).not.toBeNull();

  tree.props.onClick();
  await wait(100);

  expect(layer.Root!['_internalRoot']).toBeNull();
})
